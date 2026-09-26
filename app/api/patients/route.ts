export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { prisma } from "@/lib/db";
import { isDbUnreachableError, MOCK_PATIENTS, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET(request: NextRequest) {
  try {
    // The signed-in staff member, never the patient they may be previewing as
    // (this route is outside /api/admin, so the middleware would hand us the
    // impersonated identity).
    const actor = await getSessionStaffActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (!actor.clinicId) {
      return NextResponse.json({ error: "No clinic resolved for this account" }, { status: 403 });
    }

    const searchQuery = request.nextUrl.searchParams.get("search");
    const clinicFilter = request.nextUrl.searchParams.get("clinicId");

    // One clinic at a time, always. `?clinicId=` used to be honoured for every
    // caller, so any staff member could list another clinic's patients (names,
    // emails, phones); only a SUPERADMIN may point it at another clinic now.
    let whereClause: any = {
      role: "PATIENT",
      clinicId: actor.role === "SUPERADMIN" && clinicFilter ? clinicFilter : actor.clinicId,
    };

    if (searchQuery) {
      whereClause.OR = [
        { firstName: { contains: searchQuery, mode: "insensitive" } },
        { lastName: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true,
        clinicId: true,
        medicalScreening: {
          select: {
            id: true,
            consentGiven: true,
          },
        },
        patientAppointments: {
          select: {
            id: true,
            dateTime: true,
            status: true,
          },
          orderBy: {
            dateTime: "desc",
          },
          take: 5,
        },
        patientQuestionsReceived: {
          where: { status: "answered" },
          select: { id: true },
        },
        clinicMessagesReceived: {
          where: { senderRole: "patient", readAt: null },
          select: { id: true },
        },
        /**
         * Vídeos de exercício esperando revisão.
         *
         * Eu tinha posto esta contagem em `/api/admin/patients` — e a lista
         * lê **esta** rota. A marca existia na tela e nunca chegava dado para
         * acendê-la, o que é o pior tipo de defeito: nada quebra, e a pessoa
         * conclui que ninguém mandou vídeo (achado pelo Bruno no iPad,
         * 26/09/2026).
         *
         * Vem junto do `include` que já busca mensagens e perguntas: não é
         * consulta a mais por paciente.
         */
        exerciseSubmissions: {
          where: { reviewedAt: null },
          select: { id: true },
        },
        diagnosesAsPatient: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { status: true },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const patientsWithCount = patients.map((p: any) => ({
      ...p,
      answeredQCount: p.patientQuestionsReceived?.length ?? 0,
      unreadMessages: p.clinicMessagesReceived?.length ?? 0,
      videosEsperando: p.exerciseSubmissions?.length ?? 0,
      latestDiagnosisStatus: p.diagnosesAsPatient?.[0]?.status ?? null,
      patientQuestionsReceived: undefined,
      clinicMessagesReceived: undefined,
      exerciseSubmissions: undefined,
      diagnosesAsPatient: undefined,
    }));

    return NextResponse.json({ patients: patientsWithCount });
  } catch (error) {
    console.error("Error fetching patients:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse({ patients: MOCK_PATIENTS });
    }
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
