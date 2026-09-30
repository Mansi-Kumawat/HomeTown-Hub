// POST /api/posts/:id/like — TOGGLE a like. If the row (post,user) exists we
// remove it (unlike), otherwise we add it (like). The cached likeCount on the
// post is kept in sync so the feed never has to COUNT() thousands of rows.
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, postLikes } from "@/db/schema";
import { getAuthUser, isApprovedMember } from "@/lib/session";
import { ok, fail } from "@/lib/http";
import { notify } from "@/lib/notify";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const postId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) return fail("Post not found.", 404);
  if (!(await isApprovedMember(post.communityId, user))) return fail("Join the community to like posts.", 403);

  const existing = await db.query.postLikes.findFirst({
    where: and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)),
  });

  if (existing) {
    await db.delete(postLikes).where(eq(postLikes.id, existing.id));
    await db.update(posts).set({ likeCount: sql`greatest(${posts.likeCount} - 1, 0)` }).where(eq(posts.id, postId));
    return ok({ liked: false }, "Like removed.");
  }

  await db.insert(postLikes).values({ postId, userId: user.id });
  await db.update(posts).set({ likeCount: sql`${posts.likeCount} + 1` }).where(eq(posts.id, postId));
  if (post.authorId !== user.id) {
    const author = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, post.authorId),
      columns: { id: true },
    });
    if (author) {
      await notify(post.authorId, "new_like", `${user.name} liked your post.`, `/communities/${post.communityId}`);
    }
  }
  const fresh = await db.query.posts.findFirst({ where: eq(posts.id, postId), columns: { likeCount: true } });
  return ok({ liked: true, likeCount: fresh?.likeCount }, "Liked!");
}
