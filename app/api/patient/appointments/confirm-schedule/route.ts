import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/patient/appointments/confirm-schedule
// Converts PENDING_PATIENT appointments → CONFIRMED for this patient.
// Optional body { protocolId } confirms only that protocol's sessions.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).id;

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
