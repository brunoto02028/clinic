import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — staff-facing notification bell (activity 49's own follow-up: the
// admin header's bell had no data behind it at all before this). Computed
// on demand from the same source as the daily e-mail/card, not persisted —
// so there's nothing to mark "read"; it simply stops appearing once the
// patient catches up.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const { missing } = await getClinicDailyAdherence(clinicId, new Date());

  const notifications = missing.map((p) => ({
    id: `adherence-${p.patientId}`,
    title: p.name,
    message: `Missing today: ${p.missingItems.map((i) => i.title).join(", ")}`,
    link: `/admin/patients/${p.patientId}`,
    createdAt: new Date().toISOString(),
  }));

  return NextResponse.json({ notifications, count: notifications.length });
}
