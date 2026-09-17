import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getExpectedToday } from "@/lib/patient-daily-adherence";

export const dynamic = "force-dynamic";

// GET — one patient's today's-plan status, for the adherence panel on
// their own profile page. Same source as the clinic-wide card/e-mail
// (activity 49), just scoped to a single patient instead of aggregated.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await staffPatientAccess(req, params.id);
  if (access.response) return access.response;

  const today = await getExpectedToday(params.id, new Date());
  const missing = today.expected.filter((e) => !today.completed.some((c) => c.id === e.id));

  return NextResponse.json({
    hasPlan: today.expected.length > 0,
    allDone: today.allDone,
    missing,
  });
}
