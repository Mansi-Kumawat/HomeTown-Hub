// GET /api/admin/users — admin-only user directory with search
// (?q= matches name or email) and pagination. Password hashes never leave
// the server thanks to column selection.
import { NextRequest, NextResponse } from "next/server";
import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);

  const url = new URL(req.url);
  const q = clean(url.searchParams.get("q"));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 10;

  const rows = await db.query.users.findMany({
    where: q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined,
    columns: { passwordHash: false },
    orderBy: [desc(users.createdAt)],
    limit: limit + 1,
    offset: (page - 1) * limit,
  });

  return ok({ users: rows.slice(0, limit), hasMore: rows.length > limit, page });
}
