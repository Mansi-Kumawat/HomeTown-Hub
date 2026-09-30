// /api/moderator-applications — the "become a moderator" module.
//   POST — a member applies, with a short reason. { communityId, reason }
//   GET  — ?communityId= list for the community creator / platform admin.
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { communities, moderatorApplications } from "@/db/schema";
import { getAuthUser, getMembership, isCommunityCreator } from "@/lib/session";
import { ok, fail, clean, missingField } from "@/lib/http";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const body = await req.json().catch(() => ({}));
  if (missingField(body, ["reason"])) return fail("Please write a short reason (a sentence or two).");
  const communityId = Number(body.communityId);
  const reason = clean(body.reason);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community || community.status !== "approved") return fail("Community not found.", 404);
  if (community.createdById === user.id) return fail("You created this community — you're already in charge!");

  const membership = await getMembership(communityId, user.id);
  if (membership?.status !== "approved") return fail("Join this community first, then apply to moderate.");
  if (membership.communityRole === "moderator") return fail("You're already a moderator here.");

  const pending = await db.query.moderatorApplications.findFirst({
    where: and(
      eq(moderatorApplications.communityId, communityId),
      eq(moderatorApplications.applicantId, user.id),
      eq(moderatorApplications.status, "pending")
    ),
  });
  if (pending) return ok(null, "Your application is already waiting for review.");

  const [application] = await db
    .insert(moderatorApplications)
    .values({ communityId, applicantId: user.id, reason })
    .returning();

  await notify(
    community.createdById,
    "moderator_application",
    `${user.name} applied to moderate “${community.name}”.`,
    `/communities/${communityId}?tab=moderation`
  );

  return ok({ application }, "Application sent! The community creator will review it.", 201);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const url = new URL(req.url);
  const communityId = Number(url.searchParams.get("communityId"));
  if (!communityId) return fail("Provide ?communityId=");
  if (!(await isCommunityCreator(communityId, user))) {
    return fail("Only the community creator (or an admin) can view applications.", 403);
  }

  const applications = await db.query.moderatorApplications.findMany({
    where: eq(moderatorApplications.communityId, communityId),
    with: { applicant: { columns: { id: true, name: true, hometown: true, currentCity: true, avatarUrl: true } } },
    orderBy: [desc(moderatorApplications.createdAt)],
  });
  return ok({ applications });
}
