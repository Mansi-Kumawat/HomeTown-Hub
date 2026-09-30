// POST /api/auth/login — verify email + password, return a JWT.
// Uses one vague error message ("Invalid email or password") so attackers
// can't tell which part was wrong.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkPassword, signToken, publicUser } from "@/lib/auth";
import { ok, fail, clean, rateLimited, clientIp } from "@/lib/http";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: max 10 logins per 15 min per IP (block brute-force bots).
  if (rateLimited(`login:${clientIp(req)}`, 10)) {
    return fail("Too many login attempts. Please wait a few minutes.", 429);
  }

  const body = await req.json().catch(() => ({}));
  const email = clean(body.email).toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return fail("Please enter your email and password.");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const passwordOk = user ? await checkPassword(password, user.passwordHash) : false;
  if (!user || !passwordOk) return fail("Invalid email or password.", 401);
  if (!user.isActive) return fail("This account has been deactivated. Contact the platform admin.", 403);

  const token = await signToken(user.id, user.role);
  return ok({ token, user: publicUser(user) }, `Welcome back, ${user.name.split(" ")[0]}!`);
}
