// GET /api/communities/:id/members — approved members of a community,
// ordered leaders-first. Public so visitors can see who's already there.
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { communityMembers } from "@/db/schema";
import { ok, fail } from "@/lib/http";

const ROLE_ORDER: Record<string, number> = { creator: 0, moderator: 1, member: 2 };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const communityId = Number(id);
  if (!communityId) return fail("Invalid community id.");

  const members = await db.query.communityMembers.findMany({
    where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.status, "approved")),
    with: { user: { columns: { id: true, name: true, hometown: true, currentCity: true, avatarUrl: true, bio: true } } },
  });

  members.sort(
    (a, b) => (ROLE_ORDER[a.communityRole] ?? 3) - (ROLE_ORDER[b.communityRole] ?? 3)
  );

  return ok({ members });
}
