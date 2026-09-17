import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getOnboardingPending, ONBOARDING_REMINDER_ACTION } from "@/lib/onboarding-reminder";

export const dynamic = "force-dynamic";

// GET — one patient's onboarding-pending status, for the adherence panel
// on their own profile page.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [pending, sent] = await Promise.all([
    getOnboardingPending(params.id),
    prisma.auditLog.findFirst({
      where: { userId: params.id, action: ONBOARDING_REMINDER_ACTION, createdAt: { gte: twoDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({ ...pending, reminderSentAt: sent?.createdAt.toISOString() || null });
}
