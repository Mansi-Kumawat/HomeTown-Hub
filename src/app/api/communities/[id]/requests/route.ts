// /api/communities/:id/requests  (moderator tools)
//   GET   — list PENDING join requests (who asked to join).
//   PATCH — approve or reject one request: { membershipId, action }.
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityMembers } from "@/db/schema";
import { getAuthUser, canModerate } from "@/lib/session";
import { ok, fail } from "@/lib/http";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (!(await canModerate(communityId, user))) return fail("Moderators only.", 403);

  const requests = await db.query.communityMembers.findMany({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.status, "pending")),
    with: { user: { columns: { id: true, name: true, hometown: true, currentCity: true, avatarUrl: true } } },
    orderBy: [asc(communityMembers.createdAt)],
  });
  return ok({ requests });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (!(await canModerate(communityId, user))) return fail("Moderators only.", 403);

  const body = await req.json().catch(() => ({}));
  const membershipId = Number(body.membershipId);
  const action = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;
  if (!membershipId || !action) return fail("Provide membershipId and action (approve|reject).");

  const membership = await db.query.communityMembers.findFirst({
    where: and(eq(communityMembers.id, membershipId), eq(communityMembers.communityId, communityId)),
  });
  if (!membership) return fail("Join request not found.", 404);
  if (membership.status !== "pending") return fail("This request was already handled.");

  await db.update(communityMembers).set({ status: action }).where(eq(communityMembers.id, membershipId));

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (action === "approved") {
    await db
      .update(communities)
      .set({ memberCount: sql`${communities.memberCount} + 1` })
      .where(eq(communities.id, communityId));
  }
  await notify(
    membership.userId,
    action === "approved" ? "join_approved" : "join_rejected",
    action === "approved"
      ? `You're in! Your request to join “${community?.name}” was approved.`
      : `Your request to join “${community?.name}” was declined by the moderators.`,
    `/communities/${communityId}`
  );

  return ok(null, action === "approved" ? "Member approved." : "Request rejected.");
}
