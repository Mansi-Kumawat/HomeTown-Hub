// GET /api/auth/me — "who am I?" Used by the frontend on every page load to
// turn the stored JWT back into the live user profile.
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/session";
import { publicUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Not logged in.", 401);
  return ok({ user: publicUser(user) });
}
