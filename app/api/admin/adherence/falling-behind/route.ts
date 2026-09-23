import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { getClinicPatientsFallingBehind } from "@/lib/clinic-daily-adherence";

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

  const patients = await getClinicPatientsFallingBehind(clinicId, new Date());
  return NextResponse.json({ patients });
}
