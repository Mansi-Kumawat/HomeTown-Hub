// /api/reports
//   POST — any member flags a post OR a comment with a reason.
//   GET  — admin only: the moderation queue with content previews.
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, posts, comments } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";
import { notifyAdmins } from "@/lib/notify";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const body = await req.json().catch(() => ({}));
  const postId = Number(body.postId) || null;
  const commentId = Number(body.commentId) || null;
  const reason = clean(body.reason);
  if (!postId && !commentId) return fail("Report must target a post or a comment.");
  if (!reason) return fail("Please tell us what's wrong (a short reason).");

  if (postId && !(await db.query.posts.findFirst({ where: eq(posts.id, postId) }))) {
    return fail("That post no longer exists.", 404);
  }
  if (commentId && !(await db.query.comments.findFirst({ where: eq(comments.id, commentId) }))) {
    return fail("That comment no longer exists.", 404);
  }

  await db.insert(reports).values({ reporterId: user.id, postId, commentId, reason });
  await notifyAdmins("new_report", `${user.name} reported ${postId ? "a post" : "a comment"}: “${reason.slice(0, 60)}”`, "/admin?tab=reports");
  return ok(null, "Thanks for reporting. Our admins will review it.", 201);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // pending | dismissed | resolved | null(all)

  const rows = await db.query.reports.findMany({
    where: status ? eq(reports.status, status as "pending" | "dismissed" | "resolved") : undefined,
    with: {
      reporter: { columns: { id: true, name: true } },
      post: { with: { author: { columns: { id: true, name: true } }, community: { columns: { id: true, name: true } } } },
      comment: { with: { author: { columns: { id: true, name: true } } } },
    },
    orderBy: [desc(reports.createdAt)],
    limit: 100,
  });

  return ok({ reports: rows });
}
