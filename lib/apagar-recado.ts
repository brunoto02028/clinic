import { prisma } from "@/lib/db";
import { deleteR2Url } from "@/lib/r2";

/**
 * O paciente desfaz o recado que mandou — enquanto ninguém o viu.
 *
 * ## A regra, e por que ela é esta
 *
 * O Bruno perguntou se quem manda um recado de voz consegue ouvi-lo e apagá-lo.
 * Ouvir, sim — o tocador aparece no próprio recado. Apagar, não: a única rota
 * que apagava mensagem era a da equipe. Então um recado mandado errado ficava.
 *
 * Das formas possíveis, a escolhida foi **apagar enquanto a clínica não leu**:
 *
 * - `readAt` é marcado no instante em que o terapeuta **abre a conversa**
 *   (`/api/admin/patients/[id]/messages`, no GET). Então "não lida" quer dizer
 *   literalmente "ninguém viu ainda", e desfazer é desfazer.
 * - Depois de lida, o app não oferece apagar: diz que a clínica já ouviu e
 *   oferece mandar uma correção. "Apagar" o que já foi ouvido e agido não
 *   apagaria nada — esconderia de quem mandou, e não de quem ouviu.
 *
 * ## E apagar leva os três
 *
 * Um recado de voz não é um campo: é a **mensagem**, uma linha em
 * `PatientDocument` (`source: CHAT_UPLOAD`, criada por `saveChatAttachment`) e o
 * **arquivo** no storage. Apagar só a mensagem deixaria o áudio na lista de
 * documentos do paciente e acessível pela URL — ou seja, não apagaria.
 *
 * O id do documento vem de dentro do próprio `attachmentUrl`, que é
 * `/api/files/<docId>` — o mesmo recorte que a listagem faz para assinar o
 * token de acesso.
 *
 * *(Nota: o `DELETE` de documento do admin remove a linha e **deixa o arquivo**
 * no R2. Não mexi nele, mas vale consertar.)*
 */

export type ResultadoDeApagar =
  | { ok: true; documentoApagado: boolean; arquivoApagado: boolean }
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
   * As três condições numa consulta só, e todas necessárias.
   *
   * `patientId` amarra a conversa; `senderId` garante que é recado **dele**, e
   * não da clínica; `senderRole` fecha a porta para o caso em que um membro da
   * equipe também é paciente da própria clínica — sem ele, o recado que ele
   * mandou como terapeuta casaria com o `senderId` dele como paciente.
   *
   * Uma mensagem que não satisfaz tudo isso responde "não existe", e não
   * "proibido": dizer "existe, mas não é sua" conta ao pedinte algo que ele não
   * tinha como saber.
   */
  const recado = await (prisma as any).clinicMessage.findFirst({
    where: { id: messageId, patientId, senderId: patientId, senderRole: "patient" },
    select: { id: true, readAt: true, attachmentUrl: true },
  });
  if (!recado) return { ok: false, code: "not_found" };
  if (recado.readAt) return { ok: false, code: "already_read" };

  const docId = docIdDoAnexo(recado.attachmentUrl);

  /**
   * O documento primeiro, e fora de transação.
   *
   * Se a mensagem sumisse e o documento ficasse, sobraria um áudio órfão na
   * lista de documentos do paciente, sem nada apontando para ele — invisível
   * para quem quisesse limpar. Na outra ordem, uma falha deixa a mensagem de pé
   * com o anexo já removido, que o app mostra como recado sem áudio: feio, mas
   * honesto, e o paciente pode apertar de novo.
   */
  let documentoApagado = false;
  let arquivoApagado = false;

  if (docId) {
    const doc = await (prisma as any).patientDocument.findFirst({
      where: { id: docId, patientId },
      select: { id: true, fileUrl: true },
    });
    if (doc) {
      // O arquivo antes da linha: com a linha apagada primeiro, uma falha aqui
      // deixaria o objeto no storage sem ninguém sabendo que ele existe.
      arquivoApagado = await deleteR2Url(doc.fileUrl).catch((e) => {
        console.error("[apagar-recado] arquivo nao apagado:", e?.message);
        return false;
      });
      await (prisma as any).patientDocument.delete({ where: { id: doc.id } });
      documentoApagado = true;
    }
  }

  /**
   * E a mensagem por último, com a condição repetida no `deleteMany`.
   *
   * `readAt: null` outra vez, de propósito: entre a leitura acima e este
   * momento, o terapeuta pode ter aberto a conversa. Sem isto, o recado sairia
   * debaixo de quem já estava lendo — e a regra que o paciente aceitou ("dá para
   * desfazer até alguém ver") viraria mentira por uma corrida de milissegundos.
   */
  const apagadas = await (prisma as any).clinicMessage.deleteMany({
    where: { id: messageId, patientId, senderId: patientId, senderRole: "patient", readAt: null },
  });

  if (apagadas.count === 0) return { ok: false, code: "already_read" };

  return { ok: true, documentoApagado, arquivoApagado };
}
