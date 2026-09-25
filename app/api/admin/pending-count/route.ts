export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// Lightweight endpoint for the admin sidebar badge — counts patients with
// pending activity (unread chat messages or newly-answered questions),
// without fetching the full patient list payload.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userClinicId = (session.user as any).clinicId;

    if (userRole === "PATIENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Um `clinicId` na query só vale para quem enxerga todos os tenants. Antes
    // ele era aceito de olhos fechados: um terapeuta da clínica B pedia
    // `?clinicId=<clínica A>` e recebia as contagens da A — quantos vídeos e
    // quantas mensagens estavam parados lá. São números sem nome, mas são
    // números de outra clínica. Mesma família do `a04338cd`.
    const clinicFilter = userRole === "SUPERADMIN" ? request.nextUrl.searchParams.get("clinicId") : null;
    const effectiveClinicId = clinicFilter || userClinicId;

    // Staff sem clínica não é "staff de todas": sem um tenant para filtrar, a
    // consulta abaixo contaria o banco inteiro.
    if (!effectiveClinicId && userRole !== "SUPERADMIN") {
      return NextResponse.json({
        pendingPatients: 0, unreadMessages: 0, answeredQuestions: 0,
        unassignedMeasurements: 0, unreviewedSubmissions: 0,
      });
    }

    const userWhere: any = { role: "PATIENT" };
    if (effectiveClinicId && (userRole !== "SUPERADMIN" || clinicFilter)) {
      userWhere.clinicId = effectiveClinicId;
    }

    const [unreadMessagePatients, answeredQPatients, unassignedMeasurements, unreviewedSubmissions] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...userWhere,
          clinicMessagesReceived: { some: { senderRole: "patient", readAt: null } },
        },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          ...userWhere,
          patientQuestionsReceived: { some: { status: "answered" } },
        },
        select: { id: true },
      }),
      // Readings from the clinic's cuff waiting for someone to say whose they
      // are (activity 074, T-15). They are in nobody's record until then, so
      // the count has to be visible without opening the screen.
      effectiveClinicId
        ? (prisma as any).unassignedMeasurement.count({
            where: { clinicId: effectiveClinicId, assignedAt: null, discardedAt: null },
          })
        : Promise.resolve(0),
      // O vídeo que o paciente gravou em casa e ninguém assistiu ainda
      // (076, T-5). Sem contar aqui, o envio só apareceria para quem já
      // estivesse com o prontuário aberto — e ninguém abre um prontuário para
      // descobrir que há algo a ver.
      effectiveClinicId
        ? (prisma as any).exerciseSubmission.count({
            where: { clinicId: effectiveClinicId, reviewedAt: null },
          })
        : Promise.resolve(0),
    ]);

    const patientIds = new Set<string>([
      ...unreadMessagePatients.map((p) => p.id),
      ...answeredQPatients.map((p) => p.id),
    ]);

    return NextResponse.json({
      pendingPatients: patientIds.size,
      unreadMessages: unreadMessagePatients.length,
      answeredQuestions: answeredQPatients.length,
      unassignedMeasurements,
      unreviewedSubmissions,
    });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    return NextResponse.json({ pendingPatients: 0, unreadMessages: 0, answeredQuestions: 0, unassignedMeasurements: 0, unreviewedSubmissions: 0 });
  }
}
