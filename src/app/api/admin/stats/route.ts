// GET /api/admin/stats — Platform Admin dashboard numbers:
// totals, "posts today", pending queues, and posts-per-day for the last 7
// days (drives the dashboard bar chart).
//
// 👉 CONCEPT: "Aggregation" = asking the database to COUNT/GROUP rows instead
//    of fetching them all. We group posts by calendar day in SQL — fast even
//    with millions of rows.
import { NextRequest, NextResponse } from "next/server";
import { count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, communities, posts, events, reports } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const scalar = async (q: Promise<{ value: number }[]>) => (await q)[0]?.value ?? 0;

  const [totalUsers, activeCommunities, pendingCommunities, totalPosts, postsToday, totalEvents, openReports] =
    await Promise.all([
      scalar(db.select({ value: count() }).from(users)),
      scalar(db.select({ value: count() }).from(communities).where(eq(communities.status, "approved"))),
      scalar(db.select({ value: count() }).from(communities).where(eq(communities.status, "pending"))),
      scalar(db.select({ value: count() }).from(posts)),
      scalar(db.select({ value: count() }).from(posts).where(gte(posts.createdAt, today))),
      scalar(db.select({ value: count() }).from(events)),
      scalar(db.select({ value: count() }).from(reports).where(eq(reports.status, "pending"))),
    ]);

  // Posts grouped by day for the mini bar chart.
  const perDay = await db
    .select({
      day: sql<string>`to_char(${posts.createdAt}, 'Dy DD')`,
      key: sql<string>`to_char(${posts.createdAt}, 'YYYY-MM-DD')`,
      value: sql<number>`count(*)::int`,
    })
    .from(posts)
    .where(gte(posts.createdAt, sevenDaysAgo))
    .groupBy(sql`to_char(${posts.createdAt}, 'YYYY-MM-DD')`, sql`to_char(${posts.createdAt}, 'Dy DD')`)
    .orderBy(sql`to_char(${posts.createdAt}, 'YYYY-MM-DD')`);

  // Fill missing days with 0 so the chart always shows 7 bars.
  const chart: { day: string; value: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short", day: "2-digit" });
    chart.push({ day: label, value: perDay.find((r) => r.key === key)?.value ?? 0 });
  }

  return ok({
    stats: { totalUsers, activeCommunities, pendingCommunities, totalPosts, postsToday, totalEvents, openReports },
    chart,
  });
}
