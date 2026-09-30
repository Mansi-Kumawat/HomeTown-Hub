// /api/communities/:id/events
//   GET  — events for a community (soonest first) + whether I joined each.
//   POST — create an event (any approved member); everyone gets notified.
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { communities, events, eventAttendees } from "@/db/schema";
import { getAuthUser, isApprovedMember } from "@/lib/session";
import { ok, fail, clean, missingField } from "@/lib/http";
import { notifyCommunity } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community || community.status !== "approved") return fail("Community not found.", 404);

  const rows = await db.query.events.findMany({
    where: eq(events.communityId, communityId),
    with: { creator: { columns: { id: true, name: true, avatarUrl: true } } },
    orderBy: [asc(events.eventDate)],
  });

  const user = await getAuthUser(req);
  let joinedIds = new Set<number>();
  if (user && rows.length) {
    const mine = await db
      .select({ eventId: eventAttendees.eventId })
      .from(eventAttendees)
      .where(and(eq(eventAttendees.userId, user.id), inArray(eventAttendees.eventId, rows.map((e) => e.id))));
    joinedIds = new Set(mine.map((m) => m.eventId));
  }

  return ok({ events: rows.map((e) => ({ ...e, joinedByMe: joinedIds.has(e.id) })) });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const community = await db.query.communities.findFirst({ where: eq(communities.id, communityId) });
  if (!community || community.status !== "approved") return fail("Community not found.", 404);
  if (!(await isApprovedMember(communityId, user))) {
    return fail("Join this community first — a moderator must approve your request.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const missing = missingField(body, ["title", "eventDate", "location"]);
  if (missing) return fail(`Please fill in the ${missing}.`);

  const eventDate = new Date(body.eventDate);
  if (Number.isNaN(eventDate.getTime())) return fail("Please pick a valid date and time.");

  const [event] = await db
    .insert(events)
    .values({
      communityId,
      creatorId: user.id,
      title: clean(body.title),
      description: clean(body.description),
      location: clean(body.location),
      eventDate,
      imageUrl: clean(body.imageUrl),
    })
    .returning();

  await notifyCommunity(
    communityId,
    user.id,
    "new_event",
    `New event in “${community.name}”: ${event.title}`,
    `/communities/${communityId}?tab=events`
  );

  return ok({ event: { ...event, joinedByMe: false } }, "Event created!", 201);
}
