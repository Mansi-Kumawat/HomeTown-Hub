// /api/communities/:id/posts
//   GET  — the community feed. Pinned posts first, then newest. Paginated
//          (?page=1&limit=8) so the feed stays fast as it grows.
//   POST — create a post (approved members only). "announcement" type is a
//          moderator privilege.
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { communities, posts, postLikes } from "@/db/schema";
import { getAuthUser, isApprovedMember, canModerate } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";
import { notifyCommunity } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community || community.status !== "approved") return fail("Community not found.", 404);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(20, Number(url.searchParams.get("limit")) || 8);

  const rows = await db.query.posts.findMany({
    where: eq(posts.communityId, communityId),
    with: { author: { columns: { id: true, name: true, avatarUrl: true, hometown: true } } },
    orderBy: [desc(posts.isPinned), desc(posts.createdAt)],
    limit: limit + 1,
    offset: (page - 1) * limit,
  });

  // Mark which of these posts the caller already liked (ONE extra query).
  const slice = rows.slice(0, limit);
  let likedIds = new Set<number>();
  const user = await getAuthUser(req);
  if (user && slice.length) {
    const likes = await db
      .select({ postId: postLikes.postId })
      .from(postLikes)
      .where(and(eq(postLikes.userId, user.id), inArray(postLikes.postId, slice.map((p) => p.id))));
    likedIds = new Set(likes.map((l) => l.postId));
  }

  return ok({
    posts: slice.map((p) => ({ ...p, likedByMe: likedIds.has(p.id) })),
    hasMore: rows.length > limit,
    page,
  });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community || community.status !== "approved") return fail("Community not found.", 404);
  if (!(await isApprovedMember(communityId, user))) {
    return fail("Join this community first — a moderator must approve your request.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const content = clean(body.content);
  const imageUrl = clean(body.imageUrl);
  if (!content && !imageUrl) return fail("Write something or add an image to post.");

  // Announcements are reserved for moderators/creators/admins.
  const wantsAnnouncement = body.type === "announcement";
  const type = wantsAnnouncement && (await canModerate(communityId, user)) ? "announcement" : "normal";

  const [post] = await db
    .insert(posts)
    .values({ communityId, authorId: user.id, type, content, imageUrl })
    .returning();

  await notifyCommunity(
    communityId,
    user.id,
    type === "announcement" ? "announcement" : "new_post",
    type === "announcement"
      ? `New announcement in “${community.name}”: ${content.slice(0, 80)}`
      : `${user.name} posted in “${community.name}”.`,
    `/communities/${communityId}`
  );

  return ok({ post: { ...post, author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }, likedByMe: false } }, "Posted!", 201);
}
