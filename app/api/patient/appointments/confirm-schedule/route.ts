import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/patient/appointments/confirm-schedule
// Converts PENDING_PATIENT appointments → CONFIRMED for this patient.
// Optional body { protocolId } confirms only that protocol's sessions.
export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_appointments" });
  if (__gate.response) return __gate.response;

  try {
    const effective = await getEffectiveUser();
    if (!effective || effective.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // This writes a ClinicMessage that reads to staff as "the patient
    // confirmed" — indistinguishable from a genuine patient action. Blocked
    // during impersonation like the other patient-initiated writes
    // (app/api/patient/profile, app/api/patient/consent).
    if (effective.isImpersonating) {
      return NextResponse.json({ error: "Cannot confirm schedule while impersonating" }, { status: 403 });
    }
    const patientId = effective.userId;

    let protocolId: string | null = null;
    try {
      const body = await req.json();
      protocolId = body?.protocolId || null;
    } catch {} // empty body is fine — confirms all

    const where: any = { patientId, status: "PENDING_PATIENT" };
    if (protocolId) {
      // Include legacy appointments without protocolId so nothing gets stranded
      where.OR = [{ protocolId }, { protocolId: null }];
    }

    const result = await (prisma as any).appointment.updateMany({
      where,
      data: { status: "CONFIRMED" },
    });

    // Notify the clinic that the patient confirmed the schedule
    if (result.count > 0) {
      try {
        await (prisma as any).clinicMessage.create({
          data: {
            patientId,
            senderId: patientId,
            senderRole: "patient",
            kind: "notice",
            title: "Agenda confirmada",
            content: `✅ O paciente confirmou a agenda de tratamento (${result.count} ${result.count === 1 ? "sessão" : "sessões"}).`,
          },
        });
      } catch (e) {
        console.error("[confirm-schedule] clinic notice error:", e);
      }
    }

    return NextResponse.json({ confirmed: result.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
