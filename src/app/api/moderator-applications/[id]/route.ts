// PATCH /api/moderator-applications/:id — community creator (or admin)
// approves/rejects: { action: "approve" | "reject" }.
// On approval the member's communityRole becomes "moderator" and their global
// role upgrades to "moderator" too (first community they moderate).
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { communities, communityMembers, moderatorApplications, users } from "@/db/schema";
import { getAuthUser, isCommunityCreator } from "@/lib/session";
import { ok, fail } from "@/lib/http";
import { notify } from "@/lib/notify";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("Please log in.", 401);

  const application = await db.query.moderatorApplications.findFirst({
    where: eq(moderatorApplications.id, Number(id)),
  });
  if (!application) return fail("Application not found.", 404);
  if (application.status !== "pending") return fail("This application was already handled.");
  if (!(await isCommunityCreator(application.communityId, user))) {
    return fail("Only the community creator (or an admin) can decide.", 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;
  if (!action) return fail("Action must be approve or reject.");

  await db.update(moderatorApplications).set({ status: action }).where(eq(moderatorApplications.id, application.id));

  const community = await db.query.communities.findFirst({ where: eq(communities.id, application.communityId) });

  if (action === "approved") {
    await db
      .update(communityMembers)
      .set({ communityRole: "moderator" })
      .where(and(eq(communityMembers.communityId, application.communityId), eq(communityMembers.userId, application.applicantId)));
    // Upgrade their platform-wide role on first moderation (keeps "member" if already admin).
    const applicant = await db.query.users.findFirst({ where: eq(users.id, application.applicantId) });
    if (applicant?.role === "member") {
      await db.update(users).set({ role: "moderator" }).where(eq(users.id, applicant.id));
    }
  }

  await notify(
    application.applicantId,
    action === "approved" ? "moderator_approved" : "moderator_rejected",
    action === "approved"
      ? `You're now a moderator of “${community?.name}”. Welcome aboard!`
      : `Your moderator application for “${community?.name}” was declined.`,
    `/communities/${application.communityId}`
  );

  return ok(null, action === "approved" ? "Moderator approved." : "Application rejected.");
}
