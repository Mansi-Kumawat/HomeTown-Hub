// POST /api/events/:id/rsvp — TOGGLE attendance (join ⇄ leave) and keep the
// cached attendeeCount in sync, exactly like the like-toggle pattern.
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, eventAttendees } from "@/db/schema";
import { getAuthUser, isApprovedMember } from "@/lib/session";
import { ok, fail } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const eventId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return fail("Event not found.", 404);
  if (!(await isApprovedMember(event.communityId, user))) return fail("Join the community to attend events.", 403);

  const existing = await db.query.eventAttendees.findFirst({
    where: and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.userId, user.id)),
  });

  if (existing) {
    await db.delete(eventAttendees).where(eq(eventAttendees.id, existing.id));
    await db.update(events).set({ attendeeCount: sql`greatest(${events.attendeeCount} - 1, 0)` }).where(eq(events.id, eventId));
    const fresh = await db.query.events.findFirst({ where: eq(events.id, eventId), columns: { attendeeCount: true } });
    return ok({ joined: false, attendeeCount: fresh?.attendeeCount }, "You left the event.");
  }

  await db.insert(eventAttendees).values({ eventId, userId: user.id });
  await db.update(events).set({ attendeeCount: sql`${events.attendeeCount} + 1` }).where(eq(events.id, eventId));
  const fresh = await db.query.events.findFirst({ where: eq(events.id, eventId), columns: { attendeeCount: true } });
  return ok({ joined: true, attendeeCount: fresh?.attendeeCount }, "You're on the list. See you there!");
}
