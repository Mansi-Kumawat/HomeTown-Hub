// ============================================================================
// NOTIFICATION HELPERS — one tiny function to drop a bell-notification into
// a user's inbox, plus fan-out helpers for a whole community / its leaders.
// API routes call these after important actions (new post, new event, etc.).
// ============================================================================

import { and, eq, ne, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, communityMembers } from "@/db/schema";

/** Create a single notification for one user. */
export async function notify(userId: number, type: string, message: string, link = "") {
  await db.insert(notifications).values({ userId, type, message, link });
}

/** Bulk-insert the same notification for a list of user ids. */
async function notifyMany(userIds: number[], type: string, message: string, link = "") {
  if (userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map((userId) => ({ userId, type, message, link }))
  );
}

/** Notify every APPROVED member of a community (except the person who acted). */
export async function notifyCommunity(
  communityId: number,
  exceptUserId: number,
  type: string,
  message: string,
  link = ""
) {
  const members = await db
    .select({ userId: communityMembers.userId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.status, "approved"),
        ne(communityMembers.userId, exceptUserId)
      )
    );
  await notifyMany(members.map((m) => m.userId), type, message, link);
}

/** Notify only the creator + moderators of a community (e.g. new join request). */
export async function notifyCommunityLeaders(
  communityId: number,
  exceptUserId: number,
  type: string,
  message: string,
  link = ""
) {
  const leaders = await db
    .select({ userId: communityMembers.userId })
    .from(communityMembers)
    .where(
      and(
        eq(communityMembers.communityId, communityId),
        eq(communityMembers.status, "approved"),
        inArray(communityMembers.communityRole, ["creator", "moderator"]),
        ne(communityMembers.userId, exceptUserId)
      )
    );
  await notifyMany(leaders.map((l) => l.userId), type, message, link);
}

/** Notify every platform admin (e.g. a new community needs approval). */
export async function notifyAdmins(type: string, message: string, link = "") {
  const admins = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.role, "admin"),
    columns: { id: true },
  });
  await notifyMany(admins.map((a) => a.id), type, message, link);
}
