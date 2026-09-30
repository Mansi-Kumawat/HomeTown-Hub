// POST /api/auth/register — create a new account (role: member).
// Validates input, checks the email is free, hashes the password, stores the
// user and returns a JWT so they're logged in immediately.
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, signToken, publicUser } from "@/lib/auth";
import { ok, fail, clean, isEmail, missingField, rateLimited, clientIp } from "@/lib/http";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (rateLimited(`register:${clientIp(req)}`, 10)) {
    return fail("Too many attempts. Please wait a few minutes and try again.", 429);
  }

  const body = await req.json().catch(() => ({}));
  const missing = missingField(body, ["name", "email", "password"]);
  if (missing) return fail(`Please fill in your ${missing}.`);

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const password = String(body.password);
  const hometown = clean(body.hometown);
  const currentCity = clean(body.currentCity);

  if (name.length < 2) return fail("Please enter your full name.");
  if (!isEmail(email)) return fail("That email address doesn't look right.");
  if (password.length < 6) return fail("Password must be at least 6 characters.");

  // Emails are unique — refuse duplicates with a helpful message.
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return fail("An account with this email already exists. Try logging in.", 409);

  // The very first account ever created becomes the Platform Admin so the
  // site is never left without someone able to approve communities.
  const isFirstUser = !(await db.query.users.findFirst());

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      hometown,
      currentCity,
      role: isFirstUser ? "admin" : "member",
    })
    .returning();

  const token = await signToken(user.id, user.role);
  return ok({ token, user: publicUser(user) }, "Welcome to Hometown Hub! Your account is ready.", 201);
}
