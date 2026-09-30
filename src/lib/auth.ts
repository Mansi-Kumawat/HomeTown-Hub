// ============================================================================
// AUTH PRIMITIVES — passwords + JSON Web Tokens.
//
// 👉 CONCEPT: "Hashing" (bcrypt) turns a password into a scrambled string we
//    store in the DB. It cannot be reversed — to check a login we just hash
//    the attempt and compare. If the database leaks, passwords stay safe.
//
// 👉 CONCEPT: "JWT" (JSON Web Token) is a signed ID card. On login the server
//    signs a token containing the user's id. The browser sends it with every
//    request (`Authorization: Bearer <token>`); the server re-checks the
//    signature to know WHO is calling — no session storage needed.
// ============================================================================

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// The secret lives ONLY in environment variables (never in code/git).
// A dev fallback keeps the local sandbox running if the var is missing.
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-secret-change-me-in-production"
);

const TOKEN_EXPIRY = "7d"; // login lasts 7 days

export interface TokenPayload {
  sub: string; // user id (JWT convention: "sub" = subject)
  role: string;
}

/** Hash a plain-text password before saving it (bcrypt, cost factor 10). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Compare a login attempt against the stored hash. */
export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Create a signed JWT for a freshly logged-in user. */
export async function signToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

/** Verify a token from the Authorization header. Returns null if invalid/expired. */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return { sub: payload.sub, role: String(payload.role ?? "member") };
  } catch {
    return null; // bad signature, expired, malformed — all treated as "logged out"
  }
}

/** Strip secrets out of a user row before sending it to the browser. */
export function publicUser<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash: _ignored, ...safe } = user;
  return safe;
}
