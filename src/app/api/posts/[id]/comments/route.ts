// /api/posts/:id/comments
//   GET  — all comments on a post, oldest first (a conversation reads top-down).
//   POST — add a comment (approved members only); notifies the post author.
import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, comments } from "@/db/schema";
import { getAuthUser, isApprovedMember } from "@/lib/session";
import { ok, fail, clean, missingField } from "@/lib/http";
import { notify } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const rows = await db.query.comments.findMany({
    where: eq(comments.postId, Number(id)),
    with: { author: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [asc(comments.createdAt)],
  });
  return ok({ comments: rows });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const postId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
  if (!post) return fail("Post not found.", 404);
  if (!(await isApprovedMember(post.communityId, user))) return fail("Join the community to comment.", 403);

  const body = await req.json().catch(() => ({}));
  if (missingField(body, ["content"])) return fail("Write a comment first.");
  const content = clean(body.content);
  if (content.length > 1000) return fail("Comments are limited to 1000 characters.");

  const [comment] = await db
    .insert(comments)
    .values({ postId, authorId: user.id, content })
    .returning();

  await db.update(posts).set({ commentCount: sql`${posts.commentCount} + 1` }).where(eq(posts.id, postId));

  if (post.authorId !== user.id) {
    await notify(
      post.authorId,
      "new_comment",
      `${user.name} commented on your post: “${content.slice(0, 80)}”`,
      `/communities/${post.communityId}`
    );
  }

  return ok(
    { comment: { ...comment, author: { id: user.id, name: user.name, avatarUrl: user.avatarUrl } } },
    "Comment added.",
    201
  );
}
