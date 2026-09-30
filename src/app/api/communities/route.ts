// /api/communities
//   GET  — browse/search approved communities (paginated).
//          Admins may pass ?status=pending|rejected|all to moderate.
//          ?member=me returns communities the caller belongs to.
//   POST — create a community (starts life "pending" until an admin approves).
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityMembers } from "@/db/schema";
import { getAuthUser } from "@/lib/session";
import { ok, fail, clean, missingField } from "@/lib/http";
import { notifyAdmins } from "@/lib/notify";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  const url = new URL(req.url);
  const q = clean(url.searchParams.get("q"));
  const categoryId = Number(url.searchParams.get("categoryId")) || null;
  const status = clean(url.searchParams.get("status")) || "approved";
  const mine = url.searchParams.get("member") === "me";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(24, Number(url.searchParams.get("limit")) || 9);

  const conditions = [];
  if (q) conditions.push(or(ilike(communities.name, `%${q}%`), ilike(communities.city, `%${q}%`)));
  if (categoryId) conditions.push(eq(communities.categoryId, categoryId));

  if (mine) {
    // Only communities where I am an approved member.
    if (!user) return fail("Please log in.", 401);
    const rows = await db
      .select({ id: communityMembers.communityId })
      .from(communityMembers)
      .where(and(eq(communityMembers.userId, user.id), eq(communityMembers.status, "approved")));
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return ok({ communities: [], hasMore: false, page });
    conditions.push(inArray(communities.id, ids));
  } else {
    if (status !== "approved" && user?.role !== "admin") {
      return fail("Only admins can view unapproved communities.", 403);
    }
    if (status !== "all") conditions.push(eq(communities.status, status as "pending" | "approved" | "rejected"));
  }

  const rows = await db.query.communities.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { category: true, creator: { columns: { id: true, name: true } } },
    orderBy: [desc(communities.memberCount), desc(communities.createdAt)],
    limit: limit + 1, // fetch one extra row → cheap "hasMore" check
    offset: (page - 1) * limit,
  });

  return ok({
    communities: rows.slice(0, limit),
    hasMore: rows.length > limit,
    page,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const body = await req.json().catch(() => ({}));
  const missing = missingField(body, ["name", "city", "description"]);
  if (missing) return fail(`Please fill in the ${missing}.`);

  const name = clean(body.name);
  const city = clean(body.city);
  if (name.length < 3) return fail("Community name must be at least 3 characters.");

  const [community] = await db
    .insert(communities)
    .values({
      name,
      city,
      description: clean(body.description),
      rules: clean(body.rules),
      imageUrl: clean(body.imageUrl),
      categoryId: Number(body.categoryId) || null,
      createdById: user.id,
      status: "pending",          // ← waits for a Platform Admin
      memberCount: 1,             // creator is member #1
    })
    .returning();

  // Creator automatically joins as approved "creator".
  await db.insert(communityMembers).values({
    communityId: community.id,
    userId: user.id,
    status: "approved",
    communityRole: "creator",
  });

  await notifyAdmins(
    "community_pending",
    `${user.name} created “${name}” (${city}) and is waiting for approval.`,
    "/admin?tab=communities"
  );

  return ok(
    { community },
    "Community submitted! A platform admin will review it shortly.",
    201
  );
}
