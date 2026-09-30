// ============================================================================
// SESSION + AUTHORIZATION HELPERS
//
// 👉 CONCEPT: "Middleware/guard" = code that runs BEFORE a route handler to
//    decide if the request is allowed. In Next.js route handlers we do it with
//    small functions: `requireUser` (are you logged in?) and permission flags
//    like `canModerate` (are you allowed to control THIS community?).
// ============================================================================

import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, communityMembers, communities } from "@/db/schema";
import { verifyToken } from "@/lib/auth";

export type AuthUser = typeof users.$inferSelect;

/** Read `Authorization: Bearer <token>`, verify it, and load the user row.
 *  Returns null for anonymous/deactivated users. */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const payload = await verifyToken(header.slice(7));
  if (!payload) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(payload.sub)),
  });
  if (!user || !user.isActive) return null;
  return user;
}

/** A community membership row (or null if the user never joined). */
export async function getMembership(communityId: number, userId: number) {
  return db.query.communityMembers.findFirst({
    where: and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userId, userId)
    ),
  });
}

/** TRUE if the user may post/react in the community (approved member or admin). */
export async function isApprovedMember(communityId: number, user: AuthUser): Promise<boolean> {
  if (user.role === "admin") return true;
  const m = await getMembership(communityId, user.id);
  return m?.status === "approved";
}

/** TRUE if the user may pin/delete/approve inside the community:
 *  platform admin, community creator, or a moderator of that community. */
export async function canModerate(communityId: number, user: AuthUser): Promise<boolean> {
  if (user.role === "admin") return true;
  const m = await getMembership(communityId, user.id);
  return (
    m?.status === "approved" &&
    (m.communityRole === "creator" || m.communityRole === "moderator")
  );
}

/** TRUE if the user created the community (used for moderator approvals). */
export async function isCommunityCreator(communityId: number, user: AuthUser): Promise<boolean> {
  if (user.role === "admin") return true;
  const c = await db.query.communities.findFirst({
    where: eq(communities.id, communityId),
  });
  return c?.createdById === user.id;
}
