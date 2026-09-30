// /api/communities/:id/join
//   POST   — request to join (moderator of the community must approve).
//   DELETE — leave the community (creators can't leave their own community).
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityMembers } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail } from "@/lib/http";
import { notifyCommunityLeaders } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in to join a community.", 401);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community) return fail("Community not found.", 404);
  if (community.status !== "approved") return fail("This community isn't open yet.", 403);

  const existing = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)),
  });
  if (existing?.status === "approved") return fail("You're already a member of this community.");
  if (existing?.status === "pending") return ok(null, "Your join request is already waiting for a moderator.");

  if (existing) {
    // Previously rejected → turn it back into a fresh pending request.
    await db
      .update(communityMembers)
      .set({ status: "pending" })
      .where(eq(communityMembers.id, existing.id));
  } else {
    await db.insert(communityMembers).values({ communityId, userId: user.id });
  }

  await notifyCommunityLeaders(
    communityId,
    user.id,
    "join_request",
    `${user.name} requested to join “${community.name}”.`,
    `/communities/${communityId}?tab=moderation`
  );

  return ok(null, "Join request sent! A moderator will review it soon.", 201);
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const membership = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)),
  });
  if (!membership) return fail("You are not a member of this community.");
  if (membership.communityRole === "creator") {
    return fail("Creators can't leave their own community. Ask an admin for help.");
  }

  await db.delete(communityMembers).where(eq(communityMembers.id, membership.id));
  if (membership.status === "approved") {
    await db
      .update(communities)
      .set({ memberCount: sql`greatest(${communities.memberCount} - 1, 0)` })
      .where(eq(communities.id, communityId));
  }
  return ok(null, "You have left the community.");
}
