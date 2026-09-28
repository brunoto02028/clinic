import { prisma } from "@/lib/db";
import type { LabReviewMode } from "@prisma/client";

/**
 * Quem lê o resultado primeiro — e a resposta agora é **a pessoa** (26/09/2026).
 *
 * Isto mudou três vezes, e a última é definitiva porque é contratual:
 *
 *   > "os resultados do laboratório vão para o paciente, o paciente pode pedir
 *   > qualquer exame independente da clinic, nada é associado; pelo contrato,
 *   > nós facilitamos a vida do paciente dando acesso a exames privados, e
 *   > depois de receber os exames as pessoas podem enviar para o médico de sua
 *   > preferência" — Bruno, 26/09/2026
 *
 * O desenho anterior (081) segurava o resultado de quem tinha relação clínica
 * até a clínica ler e liberar. Isso fazia sentido enquanto o exame era da
 * clínica; deixou de fazer quando ele virou um produto que qualquer pessoa
 * compra. E os termos publicados hoje dizem, em duas línguas, que **ninguém da
 * clínica lê antes** — código e contrato não podem discordar sobre isso.
 *
 * **As colunas continuam no banco.** `LabOrder.reviewMode`,
 * `releasedToPatientAt`, `releaseNote` e `releaseNotePt` não foram removidas:
 * apagar coluna é perder o que já foi gravado, e o guard de migração existe
 * para impedir exatamente isso. Elas ficam preenchidas com o caminho direto —
 * `releasedToPatientAt` na chegada do resultado — e nada mais as consulta para
 * decidir.
 *
 * Compartilhar com a terapeuta é ação **da pessoa**, não da clínica. Ainda não
 * existe, e é a próxima coisa a construir aqui.
 */

/**
 * Sempre `DIRECT`.
 *
 * A função sobrevive à decisão em vez de sumir porque quem grava o pedido
 * continua precisando de um valor para a coluna, e porque um dia pode haver
 * outro modo (um médico que assina laudo, por exemplo). Um `return "DIRECT"`
 * com o porquê escrito é mais honesto que espalhar a constante por cinco
 * chamadores.
 */
export async function reviewModeFor(_patientId: string, _clinicId: string | null): Promise<LabReviewMode> {
  return "DIRECT";
}

/**
 * A frase de não-diagnóstico.
 *
 * Era duas, escolhidas por quem tinha lido. Agora ninguém lê antes, então é uma
 * — e ela diz isso. "Seu terapeuta os revisou" seria mentira, e é o tipo de
 * mentira que importa, porque é exatamente o que daria confiança ao número.
 */
export function nonDiagnosticCopy(): { en: string; pt: string } {
  return {
    en: "These results are for information and do not replace a consultation. Nobody has reviewed them for you — if anything concerns you, share them with a clinician of your choice.",
    pt: "Estes resultados são informativos e não substituem uma consulta. Ninguém os revisou para você — se algo preocupar, compartilhe com um profissional de saúde da sua escolha.",
  };
}

/**
 * A pessoa virou paciente desta clínica (083).
 *
 * Chamado no primeiro ato clínico — a consulta marcada, o pacote dado. É o
 * momento em que ela deixa de ser alguém que comprou um exame e passa a ter
 * prontuário, exercícios e conversa. Idempotente: só vai de false para true.
 *
 * Comprar exame continua não sendo ato clínico, e agora nem o resultado passa
 * pela clínica.
 */
export async function markAsClinicPatient(patientId: string, clinicId: string): Promise<void> {
  await prisma.user.updateMany({
    where: { id: patientId, clinicId, role: "PATIENT", isClinicPatient: false },
    data: { isClinicPatient: true },
  });
}
