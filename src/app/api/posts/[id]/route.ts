// /api/posts/:id
//   GET    — one post (used for shared links).
//   PATCH  — { action: "pin" } toggles pinned (moderators only).
//   DELETE — remove a post (author, community moderator, or platform admin).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getAuthUser, canModerate } from "@/lib/session";
import { ok, fail } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, Number(id)),
    with: {
      author: { columns: { id: true, name: true, avatarUrl: true, hometown: true } },
      community: { columns: { id: true, name: true, city: true } },
    },
  });
  if (!post) return fail("Post not found.", 404);
  return ok({ post });
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const post = await db.query.posts.findFirst({ where: eq(posts.id, Number(id)) });
  if (!post) return fail("Post not found.", 404);
  if (!(await canModerate(post.communityId, user))) return fail("Only moderators can pin posts.", 403);

  const body = await req.json().catch(() => ({}));
  if (body.action !== "pin") return fail("Unknown action.");

  const [updated] = await db
    .update(posts)
    .set({ isPinned: !post.isPinned })
    .where(eq(posts.id, post.id))
    .returning();
  return ok({ post: updated }, updated.isPinned ? "Post pinned to the top." : "Post unpinned.");
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const post = await db.query.posts.findFirst({ where: eq(posts.id, Number(id)) });
  if (!post) return fail("Post not found.", 404);

  const allowed = post.authorId === user.id || (await canModerate(post.communityId, user));
  if (!allowed) return fail("You don't have permission to delete this post.", 403);

  await db.delete(posts).where(eq(posts.id, post.id)); // likes/comments cascade
  return ok(null, "Post deleted.");
}
