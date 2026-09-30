// ============================================================================
// HTTP HELPERS — every API response uses ONE consistent JSON envelope:
//   { success: boolean, message: string, data: any }
// Frontend code can then always check `res.success` and show `res.message`.
// Also includes tiny validation + rate-limiting helpers used by the routes.
// ============================================================================

import { NextResponse } from "next/server";

/** Send a success response: { success: true, message, data } */
export function ok(data: unknown = null, message = "OK", status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

/** Send an error response: { success: false, message } */
export function fail(message = "Something went wrong. Please try again.", status = 400) {
  return NextResponse.json({ success: false, message, data: null }, { status });
}

/** Trim a string safely (input sanitization: kills stray whitespace/newlines). */
export function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 5000) : "";
}

/** Very small email check (good enough for a friendly form error). */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Check that required fields exist and are non-empty strings. Returns the
 *  name of the first missing field, or null if everything is present. */
export function missingField(body: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    if (typeof body[field] !== "string" || (body[field] as string).trim() === "") return field;
  }
  return null;
}

// --- In-memory rate limiter (per server instance) ---------------------------
// 👉 CONCEPT: "Rate limiting" = refusing too-frequent requests from the same
//    client, so bots can't hammer /login with thousands of password guesses.
//    We keep a Map of key → [timestamps] and only allow N per time window.
const buckets = new Map<string, number[]>();

export function rateLimited(key: string, limit = 20, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return true; // over the limit → reject
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

/** Grab a best-effort client IP for rate limiting / logging. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
