// /api/categories
//   GET  — public list of categories, each with its community count.
//   POST — admin creates a new category: { name, description? }.
import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, communities } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail, clean, missingField } from "@/lib/http";

export async function GET(): Promise<NextResponse> {
  // LEFT JOIN + group: every category, with how many communities use it.
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      communityCount: sql<number>`count(${communities.id})::int`,
    })
    .from(categories)
    .leftJoin(communities, eq(communities.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return ok({ categories: rows });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);

  const body = await req.json().catch(() => ({}));
  if (missingField(body, ["name"])) return fail("Please give the category a name.");
  const name = clean(body.name);

  const exists = await db.query.categories.findFirst({ where: eq(categories.name, name) });
  if (exists) return fail("A category with this name already exists.", 409);

  const [category] = await db
    .insert(categories)
    .values({ name, description: clean(body.description) })
    .returning();
  return ok({ category }, "Category created.", 201);
}
