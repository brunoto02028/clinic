import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = "force-dynamic";

// GET /api/patient/appointments?status=PENDING_PATIENT
export async function GET(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_appointments" });
  if (__gate.response) return __gate.response;

  try {
    const effective = await getEffectiveUser();
    if (!effective || effective.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = effective.userId;
    const status = req.nextUrl.searchParams.get("status");

    const where: any = { patientId };
    if (status) where.status = status;

    const appointments = await (prisma as any).appointment.findMany({
      where,
      orderBy: { dateTime: "asc" },
      select: {
        id: true,
        dateTime: true,
        duration: true,
        // Sem `mode`, a web do paciente nunca soube dizer que uma consulta era
        // por vídeo: o campo chegava `undefined` e o formato virava presencial
        // por omissão. O app lê `/api/appointments`, que devolve a linha
        // inteira — por isso só o navegador errava.
        mode: true,
        treatmentType: true,
        status: true,
        notes: true,
        protocolId: true,
      },
    });

    return NextResponse.json({ appointments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
