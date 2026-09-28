import { prisma } from "@/lib/db";

/**
 * O paciente desfaz o recado que mandou — enquanto ninguém o viu.
 *
 * ## A regra
 *
 * O Bruno perguntou se quem manda um recado de voz consegue ouvi-lo e apagá-lo.
 * Ouvir, sim. Apagar, não: a única rota que apagava mensagem era a da equipe.
 *
 * Das formas possíveis, a escolhida foi **apagar enquanto a clínica não leu**.
 *
 * `readAt` é marcado quando a **aba de mensagens do paciente monta** no painel:
 * `components/admin/patient-messages-tab.tsx` dispara um `PATCH` em
 * `/api/admin/patients/[id]/messages`. Então "não lida" quer dizer literalmente
 * "ninguém abriu esta conversa ainda", e desfazer é desfazer.
 *
 * Depois de lida, o app oferece mandar uma correção: "apagar" o que já foi
 * ouvido esconderia de quem mandou, e não de quem ouviu.
 *
 * *(Escrevi aqui, antes, que era o **GET** que marcava. Era, e deixou de ser
 * quando isso virou um `PATCH` próprio. O QA de 27/09/2026 seguiu o meu
 * comentário, chamou o GET para simular "o terapeuta abriu", viu o recado ser
 * apagado depois disso, e quase reportou um defeito que não existe. Comentário
 * que aponta para a rota errada custa caro justamente quando ele é a
 * justificativa da regra.)*
 *
 * ## Duas coisas que o code review de 27/09/2026 corrigiu aqui
 *
 * **1. A ordem destruía o áudio na corrida que ela dizia proteger.** A versão
 * anterior lia `readAt`, apagava o documento, e só então tentava o `deleteMany`
 * condicional. Se o terapeuta abrisse a conversa nesse intervalo, o documento já
 * tinha ido, o `deleteMany` casava zero, e o resultado era o pior de todos: a
 * mensagem continuava na conversa, o app dizia ao paciente *"a clínica já viu"*,
 * e o áudio sumia para sempre — o terapeuta ficava olhando um recado de voz cujo
 * arquivo dá 404.
 *
 * Agora a mensagem sai **primeiro**, com a condição junto, e o documento só se
 * ela de fato saiu. Tudo numa transação: se o documento falhar, a mensagem
 * volta, e o paciente pode apertar de novo.
 *
 * **2. O `deleteR2Url` era um no-op garantido.** Anexo de conversa não vai para
 * o R2: `storePatientDocument` guarda os bytes em `fileData`, na própria linha, e
 * grava `fileUrl = "/api/files/<id>"`. `keyFromR2Url` faz `new URL()` nisso, que
 * lança em caminho relativo, devolve `null`, e nada é chamado.
 *
 * Ou seja: **apagar a linha já é apagar o áudio**, e o argumento de "o arquivo
 * antes da linha" descrevia um mecanismo que não existe. A chamada saiu.
 *
 * *(Se um dia os documentos migrarem para o R2, este caminho precisa apagar o
 * objeto — e aí a ordem volta a importar.)*
 */

export type ResultadoDeApagar =
  | { ok: true; documentoApagado: boolean }
  | { ok: false; code: "not_found" | "already_read" };

/** O id do `PatientDocument` embutido num `attachmentUrl`. */
export function docIdDoAnexo(attachmentUrl: string | null | undefined): string | null {
  if (typeof attachmentUrl !== "string") return null;
  return attachmentUrl.match(/\/api\/files\/([^/?]+)/)?.[1] ?? null;
}

export async function apagarRecadoDoPaciente(opts: {
  messageId: string;
  /** Quem está pedindo. Serve de dono e de remetente ao mesmo tempo. */
  patientId: string;
}): Promise<ResultadoDeApagar> {
  const { messageId, patientId } = opts;

  /**
   * As três condições de dono, e todas necessárias.
   *
   * `patientId` amarra a conversa; `senderId` garante que é recado **dele**, e
   * não da clínica; `senderRole` fecha a porta para o caso em que um membro da
   * equipe também é paciente da própria clínica — sem ele, o recado que essa
   * pessoa mandou como terapeuta casaria com o `senderId` dela como paciente.
   *
   * Esta leitura serve para dizer **por que** não deu, quando não dá: o
   * `deleteMany` abaixo repete tudo, e é ele que decide.
   */
  const recado = await (prisma as any).clinicMessage.findFirst({
    where: { id: messageId, patientId, senderId: patientId, senderRole: "patient" },
    select: { id: true, readAt: true, attachmentUrl: true },
  });
  if (!recado) return { ok: false, code: "not_found" };
  if (recado.readAt) return { ok: false, code: "already_read" };

  const docId = docIdDoAnexo(recado.attachmentUrl);

  try {
    return await prisma.$transaction(async (tx) => {
      /**
       * A mensagem primeiro, com `readAt: null` repetido.
       *
       * É esta linha que ganha ou perde a corrida contra o terapeuta abrindo a
       * conversa. Zero apagadas quer dizer que alguém viu entre a leitura e
       * agora — e nesse caso **nada** pode ter sido destruído ainda.
       */
      const apagadas = await (tx as any).clinicMessage.deleteMany({
        where: { id: messageId, patientId, senderId: patientId, senderRole: "patient", readAt: null },
      });

      if (apagadas.count === 0) {
        // Desfaz o que a transação tiver feito e sai pelo `catch`.
        throw new PerdeuACorrida();
      }

      /**
       * E o documento, que é onde o áudio mora de verdade (`fileData`).
       *
       * `deleteMany` e não `delete`: se a linha já não existir — anexo apagado
       * por outro caminho — isto é sucesso, não exceção que derrubaria a
       * transação e deixaria a mensagem de pé.
       */
      let documentoApagado = false;
      if (docId) {
        const r = await (tx as any).patientDocument.deleteMany({
          where: { id: docId, patientId },
        });
        documentoApagado = r.count > 0;
      }

      return { ok: true as const, documentoApagado };
    });
  } catch (e) {
    if (e instanceof PerdeuACorrida) return { ok: false, code: "already_read" };
    throw e;
  }
}

/** Sinaliza a corrida perdida sem confundir com uma falha de banco. */
class PerdeuACorrida extends Error {}
