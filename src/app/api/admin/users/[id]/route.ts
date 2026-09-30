// PATCH /api/admin/users/:id — admin manages ONE user:
//   { isActive: false } deactivates the account (they can no longer log in),
//   { role: "admin" | "moderator" | "member" } changes their platform role.
// Safety rails: an admin can never deactivate or demote THEMSELVES.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { publicUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

const ALLOWED_ROLES = ["admin", "moderator", "member"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const admin = await getAuthUser(req);
  if (!admin) return fail("Please log in.", 401);
  if (admin.role !== "admin") return fail("Admins only.", 403);

  const targetId = Number(id);
  const target = await db.query.users.findFirst({ where: eq(users.id, targetId) });
  if (!target) return fail("User not found.", 404);

  const body = await req.json().catch(() => ({}));
  const updates: Partial<{ isActive: boolean; role: "admin" | "moderator" | "member" }> = {};

  if (typeof body.isActive === "boolean") {
    if (targetId === admin.id && !body.isActive) return fail("You can't deactivate your own admin account.");
    updates.isActive = body.isActive;
  }
  if (typeof body.role === "string") {
    if (!ALLOWED_ROLES.includes(body.role as (typeof ALLOWED_ROLES)[number])) return fail("Invalid role.");
    if (targetId === admin.id && body.role !== "admin") return fail("You can't demote yourself.");
    updates.role = body.role as "admin" | "moderator" | "member";
  }
  if (Object.keys(updates).length === 0) return fail("Nothing to update.");

  const [updated] = await db.update(users).set(updates).where(eq(users.id, targetId)).returning();
  return ok({ user: publicUser(updated) }, "User updated.");
}
