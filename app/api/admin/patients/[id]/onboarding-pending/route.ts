import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getOnboardingPending } from "@/lib/onboarding-reminder";

export const dynamic = "force-dynamic";

// GET — one patient's onboarding-pending status, for the adherence panel
// on their own profile page.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const pending = await getOnboardingPending(params.id);
  return NextResponse.json(pending);
}
