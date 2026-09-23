import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { getClinicPatientsFallingBehind } from "@/lib/clinic-daily-adherence";
import { getFallingBehindThreshold } from "@/lib/automation/adherence-threshold";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — patients with an active protocol who've gone the configured number
// of days (lib/adherence-config.ts) without any exercise log, while
// something was liberated for them. Activity 071 — see
// specs/071-alerta-adesao-staff/plan.md. Unlike the "today" adherence
// endpoint, this never resolved via anything patient-facing (no
// notifyPatient call anywhere in this path) — it's staff-only visibility.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  // The same threshold the alert rule uses (activity 072). Two answers to
  // "how many days is behind?" meant the card and the alert could disagree
  // about the same patient.
  const thresholdDays = await getFallingBehindThreshold(clinicId);
  const patients = await getClinicPatientsFallingBehind(clinicId, new Date(), thresholdDays);
  return NextResponse.json({ patients, thresholdDays });
}
