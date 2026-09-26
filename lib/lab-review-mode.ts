import { prisma } from "@/lib/db";
import type { LabReviewMode } from "@prisma/client";

/**
 * Quem lê o resultado primeiro (081, corrigido em 26/09/2026).
 *
 * O desenho original supunha que todo exame era de um paciente da clínica.
 * Não é: **o exame é independente**. Alguém que ouviu falar do app por um
 * amigo baixa, se cadastra e compra um exame sem nunca ter sido atendido —
 * e o resultado é dele.
 *
 * A revisão pertence à **relação clínica**, não ao exame. Onde ela existe, o
 * terapeuta lê primeiro e escreve uma nota (a decisão do Bruno em 25/09).
 * Onde não existe, não há quem revise: segurar o resultado seria prender o que
 * é da pessoa esperando alguém que nunca vai olhar.
 *
 * O que conta como relação clínica: ter sido atendido. A mesma lista de status
 * que `booking-options` usa para decidir se a próxima consulta ainda é a
 * primeira — consulta cancelada não é história.
 */

const CONTA_COMO_ATENDIMENTO = ["PENDING", "PENDING_PATIENT", "CONFIRMED", "COMPLETED", "NO_SHOW"];

export async function reviewModeFor(patientId: string, clinicId: string | null): Promise<LabReviewMode> {
  if (!clinicId) return "DIRECT";

  const atendido = await prisma.appointment.count({
    where: { patientId, clinicId, status: { in: CONTA_COMO_ATENDIMENTO as any } },
  });
  if (atendido > 0) return "THERAPIST";

  // Pacote comprado também é relação: a pessoa pagou por um tratamento, ainda
  // que a primeira sessão não tenha acontecido.
  const pacote = await prisma.patientPackage.count({
    where: { patientId, clinicId, status: "ACTIVE" },
  });
  return pacote > 0 ? "THERAPIST" : "DIRECT";
}

/** O resultado deste pedido espera alguém ler? */
export function needsRelease(o: { reviewMode: LabReviewMode; releasedToPatientAt: Date | string | null }): boolean {
  return o.reviewMode === "THERAPIST" && !o.releasedToPatientAt;
}

/**
 * O pedido direto não tem liberação: quando o resultado chega, ele é da pessoa.
 * `releasedToPatientAt` é gravado junto para a tela não precisar saber a regra.
 */
export function releasesOnArrival(reviewMode: LabReviewMode): boolean {
  return reviewMode === "DIRECT";
}

/**
 * A frase de não-diagnóstico muda com quem leu.
 *
 * "Seu terapeuta os revisou" seria mentira num pedido direto — e é o tipo de
 * mentira que importa, porque é exatamente o que dá confiança ao número.
 */
export function nonDiagnosticCopy(reviewMode: LabReviewMode): { en: string; pt: string } {
  return reviewMode === "THERAPIST"
    ? {
        en: "These results are for information and do not replace a consultation. Your therapist has reviewed them.",
        pt: "Estes resultados são informativos e não substituem uma consulta. Seu terapeuta os revisou.",
      }
    : {
        en: "These results are for information and do not replace a consultation. Nobody has reviewed them for you — if anything concerns you, speak to a clinician.",
        pt: "Estes resultados são informativos e não substituem uma consulta. Ninguém os revisou para você — se algo preocupar, procure um profissional de saúde.",
      };
}

/**
 * A pessoa virou paciente desta clínica (083).
 *
 * Chamado no primeiro ato clínico — a consulta marcada, o pacote dado. É o
 * momento em que ela deixa de ser alguém que comprou um exame e passa a ter
 * prontuário, exercícios e conversa. Idempotente: só vai de false para true.
 */
export async function markAsClinicPatient(patientId: string, clinicId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: patientId, clinicId, role: "PATIENT", isClinicPatient: false },
    data: { isClinicPatient: true },
  });
}
