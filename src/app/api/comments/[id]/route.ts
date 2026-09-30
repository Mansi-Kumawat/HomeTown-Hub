// DELETE /api/comments/:id — remove a comment. Allowed for the author,
// a moderator of the post's community, or the platform admin.
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { getAuthUser, canModerate } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const comment = await db.query.comments.findFirst({ where: eq(comments.id, Number(id)) });
  if (!comment) return fail("Comment not found.", 404);

  const post = await db.query.posts.findFirst({ where: eq(posts.id, comment.postId) });
  const allowed =
    comment.authorId === user.id || (post ? await canModerate(post.communityId, user) : false);
  if (!allowed) return fail("You don't have permission to delete this comment.", 403);

  await db.delete(comments).where(eq(comments.id, comment.id));
  await db.update(posts).set({ commentCount: sql`greatest(${posts.commentCount} - 1, 0)` }).where(eq(posts.id, comment.postId));

  return ok(null, "Comment deleted.");
}
