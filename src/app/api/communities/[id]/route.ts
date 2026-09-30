// /api/communities/:id
//   GET    — public detail + the caller's relationship to it (membership, canModerate).
//   PATCH  — admins: approve/reject; creators & moderators: edit info/rules.
//   DELETE — admins only.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { communities } from "@/db/schema";
import { getAuthUser, getMembership, canModerate } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  if (!communityId) return fail("Invalid community id.");

  const community = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
    with: { category: true, creator: { columns: { id: true, name: true } } },
  });
  if (!community) return fail("Community not found.", 404);
  if (community.status !== "approved") {
    const user = await getAuthUser(req);
    const allowed = user && (user.role === "admin" || user.id === community.createdById);
    if (!allowed) return fail("This community is waiting for admin approval.", 403);
  }

  const user = await getAuthUser(req);
  const membership = user ? await getMembership(communityId, user.id) : null;
  const moderate = user ? await canModerate(communityId, user) : false;

  return ok({ community, myMembership: membership ?? null, canModerate: moderate });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community) return fail("Community not found.", 404);

  const body = await req.json().catch(() => ({}));

  // --- Admin moderation: approve / reject a community request -------------
  if (body.status === "approved" || body.status === "rejected") {
    if (user.role !== "admin") return fail("Only platform admins can approve communities.", 403);
    const [updated] = await db
      .update(communities)
      .set({ status: body.status })
      .where(eq(communities.id, communityId))
      .returning();
    await notify(
      community.createdById,
      body.status === "approved" ? "community_approved" : "community_rejected",
      body.status === "approved"
        ? `Good news! “${community.name}” was approved and is now live.`
        : `“${community.name}” was not approved. You can edit and resubmit.`,
      `/communities/${communityId}`
    );
    return ok({ community: updated }, `Community ${body.status}.`);
  }

  // --- Creator/moderator content edit -------------------------------------
  if (!(await canModerate(communityId, user))) {
    return fail("Only this community's moderators can edit it.", 403);
  }
  const [updated] = await db
    .update(communities)
    .set({
      name: clean(body.name) || community.name,
      description: clean(body.description) || community.description,
      rules: clean(body.rules) || community.rules,
      imageUrl: clean(body.imageUrl) || community.imageUrl,
      categoryId: body.categoryId ? Number(body.categoryId) : community.categoryId,
    })
    .where(eq(communities.id, communityId))
    .returning();

  return ok({ community: updated }, "Community updated.");
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Only platform admins can delete communities.", 403);

  await db.delete(communities).where(eq(communities.id, Number(id)));
  return ok(null, "Community deleted.");
}
