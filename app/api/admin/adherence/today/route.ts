import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — same adherence numbers as the daily cron/e-mail (activity 49), on
// demand for the Active Clinic instead of waiting for the 21h send.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const adherence = await getClinicDailyAdherence(clinicId, new Date());
  return NextResponse.json(adherence);
}
