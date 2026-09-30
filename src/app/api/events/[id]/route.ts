// /api/events/:id
//   PATCH  — edit an event (event creator, community moderators, admin).
//   DELETE — cancel an event (same permissions).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, communities } from "@/db/schema";
import { getAuthUser, canModerate, type AuthUser } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";
import { notifyCommunity } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };
type EventRow = typeof events.$inferSelect;

/** Shared guard for PATCH/DELETE: returns { user, event } or an HTTP error. */
async function guard(
  req: NextRequest,
  id: string
): Promise<{ user: AuthUser; event: EventRow; error?: never } | { error: NextResponse }> {
  const user = await getAuthUser(req);
  if (!user) return { error: fail("Please log in.", 401) };
  const event = await db.query.events.findFirst({ where: eq(events.id, Number(id)) });
  if (!event) return { error: fail("Event not found.", 404) };
  const allowed = event.creatorId === user.id || (await canModerate(event.communityId, user));
  if (!allowed) return { error: fail("You don't have permission to manage this event.", 403) };
  return { user, event };
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const result = await guard(req, id);
  if (result.error) return result.error;
  const { event } = result;

  const body = await req.json().catch(() => ({}));
  const eventDate = body.eventDate ? new Date(body.eventDate) : event.eventDate;
  if (Number.isNaN(eventDate.getTime())) return fail("Please pick a valid date and time.");

  const [updated] = await db
    .update(events)
    .set({
      title: clean(body.title) || event.title,
      description: clean(body.description) || event.description,
      location: clean(body.location) || event.location,
      imageUrl: clean(body.imageUrl) || event.imageUrl,
      eventDate,
    })
    .where(eq(events.id, event.id))
    .returning();

  return ok({ event: updated }, "Event updated.");
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const result = await guard(req, id);
  if (result.error) return result.error;
  const { event, user } = result;

  await db.delete(events).where(eq(events.id, event.id)); // attendees cascade
  const community = await db.query.communities.findFirst({ where: eq(communities.id, event.communityId) });
  await notifyCommunity(
    event.communityId,
    user.id,
    "event_cancelled",
    `The event “${event.title}” in “${community?.name}” was cancelled.`,
    `/communities/${event.communityId}?tab=events`
  );
  return ok(null, "Event cancelled.");
}
