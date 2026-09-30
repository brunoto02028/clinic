import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = "force-dynamic";

/**
 * GET — the patient's own session notes.
 *
 * The mobile app has been calling this path since the clinical-notes screen
 * shipped, and it did not exist: every request 404'd, and the client swallowed
 * it with `catch { return [] }`, so a patient with real notes was shown an
 * empty state indistinguishable from having none. The web reads the same data
 * through `/api/soap-notes`, which is not on the mobile prefix allowlist.
 *
 * Scoped by clinic as well as patient, like `/api/patient/protocol`: filtering
 * on patientId alone would surface a stray note from another tenant on this
 * patient's own screen.
 */
export async function GET(_req: NextRequest) {
  /**
   * **A nota clínica tem interruptor próprio** (110 T-2, 30/09/2026).
   *
   * Isto guardava com `mod_records`, que governa **também** as medidas de
   * evolução e os relatórios. Uma clínica que quisesse mostrar o progresso e
   * guardar a nota crua tinha de escolher entre tudo e nada — e escolher "tudo"
   * é como alguém lê uma hipótese provisória, escrita de profissional para
   * profissional, e entra em pânico.
   *
   * `mod_clinical_notes` existia no catálogo desde sempre e **ninguém o lia**.
   * Quem o criou tinha visto esta distinção; faltava ligá-lo.
   *
   * A web (`/api/soap-notes`) muda **no mesmo commit**, de propósito: gatear só
   * aqui deixaria o paciente ver no app o que a web esconde, que é exatamente
   * o que o comentário anterior protegia. A resposta certa era mover os dois,
   * e não manter tudo amarrado.
   *
   * Medido antes de virar: em produção nenhum plano concede um sem o outro e
   * nenhum paciente tem override de um sem o outro. Ninguém perdeu acesso.
   */
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_clinical_notes" });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true },
    });

    const notes = me?.clinicId
      ? await prisma.sOAPNote.findMany({
          // The web filters on patientId alone, so it shows older notes
          // written before SOAPNote.clinicId existed (null). Requiring an exact
          // clinicId hid those here. Legacy nulls are included; a note stamped
          // with ANOTHER clinic stays excluded — stricter than the web, which
          // would show a stray other-tenant note, and deliberately so.
          where: {
            patientId: userId,
            OR: [{ clinicId: me.clinicId }, { clinicId: null }],
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            appointmentId: true,
            subjective: true,
            objective: true,
            assessment: true,
            plan: true,
            createdAt: true,
            therapist: { select: { firstName: true, lastName: true } },
            appointment: { select: { dateTime: true, treatmentType: true } },
          },
        })
      : [];

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        appointmentId: n.appointmentId ?? undefined,
        treatmentType: n.appointment?.treatmentType ?? undefined,
        dateTime: n.appointment?.dateTime?.toISOString() ?? undefined,
        subjective: n.subjective,
        objective: n.objective,
        assessment: n.assessment,
        plan: n.plan,
        therapist: n.therapist,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AccessError) return accessErrorResponse(error);
    console.error("[patient/clinical-notes] error:", error);
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}
