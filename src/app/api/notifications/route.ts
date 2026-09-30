// /api/notifications
//   GET   — my 30 newest notifications + unread count (for the navbar bell).
//   PATCH — { ids?: number[] } mark as read; no ids = mark ALL as read.
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const rows = await db.query.notifications.findMany({
    where: eq(notifications.userId, user.id),
    orderBy: [desc(notifications.createdAt)],
    limit: 30,
  });
  const unread = rows.filter((n) => !n.isRead).length;

  return ok({ notifications: rows, unreadCount: unread });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const body = await req.json().catch(() => ({}));
  const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];

  const where = ids.length
    ? and(eq(notifications.userId, user.id), inArray(notifications.id, ids))
    : eq(notifications.userId, user.id);

  await db.update(notifications).set({ isRead: true }).where(where);
  return ok(null, "Marked as read.");
}
