// PATCH /api/reports/:id — admin resolves a report:
//   { action: "dismiss" }        → content stays, report closed.
//   { action: "deleteContent" }  → the post/comment is deleted, report resolved.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, posts, comments } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);

  const report = await db.query.reports.findFirst({ where: eq(reports.id, Number(id)) });
  if (!report) return fail("Report not found.", 404);
  if (report.status !== "pending") return fail("This report was already handled.");

  const body = await req.json().catch(() => ({}));
  if (body.action === "dismiss") {
    await db.update(reports).set({ status: "dismissed" }).where(eq(reports.id, report.id));
    return ok(null, "Report dismissed — the content stays.");
  }

  if (body.action === "deleteContent") {
    if (report.postId) await db.delete(posts).where(eq(posts.id, report.postId));
    if (report.commentId) await db.delete(comments).where(eq(comments.id, report.commentId));
    await db.update(reports).set({ status: "resolved" }).where(eq(reports.id, report.id));
    return ok(null, "Content deleted and report resolved.");
  }

  return fail("Unknown action. Use dismiss or deleteContent.");
}
