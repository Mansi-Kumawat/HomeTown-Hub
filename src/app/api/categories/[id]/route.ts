// /api/categories/:id (admin only)
//   PATCH  — rename a category / edit its description.
//   DELETE — remove it (communities keep working; their categoryId goes NULL).
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail, clean } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);
  if (user.role !== "admin") return fail("Admins only.", 403);
  return user;
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const name = clean(body.name);
  if (!name) return fail("Category name can't be empty.");

  const [updated] = await db
    .update(categories)
    .set({ name, description: clean(body.description) })
    .where(eq(categories.id, Number(id)))
    .returning();
  if (!updated) return fail("Category not found.", 404);
  return ok({ category: updated }, "Category updated.");
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await db.delete(categories).where(eq(categories.id, Number(id)));
  return ok(null, "Category deleted.");
}
