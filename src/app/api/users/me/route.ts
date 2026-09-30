// PUT /api/users/me — update YOUR own profile (name, bio, hometown,
// current city, avatar). Only the logged-in owner can do this.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { publicUser } from "@/lib/auth";
import { ok, fail, clean } from "@/lib/http";

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const body = await req.json().catch(() => ({}));
  const name = clean(body.name) || user.name;
  if (name.length < 2) return fail("Please enter your full name.");

  const [updated] = await db
    .update(users)
    .set({
      name,
      bio: clean(body.bio),
      hometown: clean(body.hometown),
      currentCity: clean(body.currentCity),
      avatarUrl: clean(body.avatarUrl),
    })
    .where(eq(users.id, user.id))
    .returning();

  return ok({ user: publicUser(updated) }, "Profile updated.");
}
