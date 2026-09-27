/**
 * @jest-environment node
 *
 * Desfazer o recado que o paciente mandou.
 *
 * ## A pergunta que originou isto
 *
 * O Bruno perguntou se quem manda um recado de voz pelo app consegue **ouvi-lo**
 * e **apagá-lo**. Ouvir, sim: o tocador aparece no próprio recado, e o `minha`
 * só muda a cor. Apagar, não — a única rota que apagava mensagem era a da
 * equipe, e o paciente não tinha nem rota nem botão. Recado mandado errado
 * ficava.
 *
 * ## A regra escolhida, e o que ela custa se for frouxa
 *
 * Apagar **enquanto a clínica não viu**. O `readAt` é marcado no instante em que
 * o terapeuta abre a conversa (`/api/admin/patients/[id]/messages`, no GET),
 * então "não lida" quer dizer literalmente "ninguém viu ainda".
 *
 * Duas coisas fáceis de errar, e os testes guardam as duas:
 *
 * 1. **Um recado de voz é três coisas** — a mensagem, uma linha em
 *    `PatientDocument` e o arquivo no storage. Apagar só a mensagem deixaria o
 *    áudio na lista de documentos do paciente e acessível pela URL. Não seria
 *    apagar; seria esconder da conversa.
 * 2. **A janela fecha sozinha.** Entre ler `readAt` e apagar, o terapeuta pode
 *    abrir a conversa. Sem repetir a condição no `deleteMany`, o recado sairia
 *    debaixo de quem já estava lendo.
 */

import { docIdDoAnexo } from "@/lib/apagar-recado";
import { ler, lerCodigo } from "../helpers/codigo";

const regra = lerCodigo("lib", "apagar-recado.ts");
const rota = lerCodigo("app", "api", "patient", "messages", "route.ts");
const tela = ler("mobile", "app", "(app)", "(clinica)", "messages.tsx");
const api = lerCodigo("mobile", "src", "api", "messages.ts");

describe("de quem é o recado, e até quando dá para desfazer", () => {
  it("**as três condições de dono estão na mesma consulta**", () => {
    // `patientId` amarra a conversa; `senderId` garante que é recado dele;
    // `senderRole` fecha a porta do caso em que alguém da equipe também é
    // paciente da propria clínica — sem ele, o recado que essa pessoa mandou
    // como terapeuta casaria com o `senderId` dela como paciente.
    expect(regra).toMatch(
      /where: \{ id: messageId, patientId, senderId: patientId, senderRole: "patient" \}/
    );
  });

  it("e lida não se apaga", () => {
    expect(regra).toMatch(/if \(recado\.readAt\) return \{ ok: false, code: "already_read" \}/);
  });

  it("**o que não é dele responde 'não existe', e não 'proibido'**", () => {
    // Dizer "existe, mas não é sua" conta ao pedinte algo que ele não tinha
    // como saber.
    expect(regra).toMatch(/if \(!recado\) return \{ ok: false, code: "not_found" \}/);
  });
});

describe("apagar leva os três: mensagem, documento e arquivo", () => {
  it("o id do documento sai de dentro do `attachmentUrl`", () => {
    expect(docIdDoAnexo("/api/files/abc123")).toBe("abc123");
    expect(docIdDoAnexo("/api/files/abc123?t=assinado")).toBe("abc123");
    expect(docIdDoAnexo("https://x/api/files/cmuj0001/algo")).toBe("cmuj0001");
  });

  it("e sem anexo não há documento a procurar", () => {
    expect(docIdDoAnexo(null)).toBeNull();
    expect(docIdDoAnexo(undefined)).toBeNull();
    expect(docIdDoAnexo("")).toBeNull();
    expect(docIdDoAnexo("/api/outra-coisa/abc")).toBeNull();
  });

  it("**o áudio mora na própria linha, então apagar a linha é apagar o áudio**", () => {
    /**
     * Aqui havia quatro asserções sobre `deleteR2Url` e sobre "o arquivo antes
     * da linha". O code review de 27/09/2026 mostrou que **aquela chamada nunca
     * fez nada**: anexo de conversa guarda os bytes em `fileData`, e `fileUrl`
     * é `/api/files/<id>` — um caminho relativo, e `new URL()` nisso lança.
     *
     * Ou seja, os testes "provavam" um mecanismo inexistente, e o argumento de
     * ordem que eu escrevi descrevia um risco que não existia. A chamada saiu, e
     * a ordem que **importa** de verdade — mensagem antes do documento, por
     * causa da corrida — é medida por comportamento em
     * `apagar-recado-comportamento.test.ts`.
     */
    expect(regra).not.toMatch(/deleteR2Url|@\/lib\/r2/);
    expect(regra).toMatch(/patientDocument\.deleteMany\(\{/);
    expect(regra).toMatch(/where: \{ id: docId, patientId \}/);
  });

  it("e tudo numa transação", () => {
    // Sem ela, o documento apagado com a mensagem de pé seria um recado de voz
    // cujo arquivo dá 404 — visível para o terapeuta, inaudível.
    expect(regra).toMatch(/prisma\.\$transaction/);
  });
});

describe("**a janela fecha sozinha, e o apagar confere de novo**", () => {
  it("o `deleteMany` repete `readAt: null`", () => {
    // Entre a leitura e este momento, o terapeuta pode ter aberto a conversa.
    // Sem isto, a regra que o paciente aceitou viraria mentira por uma corrida
    // de milissegundos.
    expect(regra).toMatch(
      /deleteMany\(\{\s*where: \{ id: messageId, patientId, senderId: patientId, senderRole: "patient", readAt: null \}/
    );
  });

  it("e zero apagadas é 'já viu', não sucesso", () => {
    // Sai por exceção para a transação desfazer o que já tiver feito. O efeito —
    // o documento **não** ser tocado — é medido em
    // `apagar-recado-comportamento.test.ts`.
    expect(regra).toMatch(/if \(apagadas\.count === 0\)/);
    expect(regra).toMatch(/throw new PerdeuACorrida\(\)/);
  });
});

describe("a rota", () => {
  it("passa pelo mesmo portão das outras do paciente", () => {
    expect(rota).toMatch(/export async function DELETE/);
    const i = rota.indexOf("export async function DELETE");
    const bloco = rota.slice(i, i + 1800);
    expect(bloco).toMatch(/patientGate\(\{ module: "mod_messages" \}\)/);
  });

  it("**quem vê como paciente não apaga o recado dele**", () => {
    // A mesma guarda de `/api/patient/account`: no modo de leitura, a ação
    // destrutiva é justamente a que não pode existir.
    const i = rota.indexOf("export async function DELETE");
    const bloco = rota.slice(i, i + 1800);
    expect(bloco).toMatch(/if \(effective\.isImpersonating\)/);
    expect(bloco.indexOf("isImpersonating")).toBeLessThan(bloco.indexOf("apagarRecadoDoPaciente"));
  });

  it("e 'já viu' é 409, separado do 404", () => {
    // São notícias diferentes: uma oferece mandar correção, a outra só recarrega.
    const i = rota.indexOf("export async function DELETE");
    const bloco = rota.slice(i, i + 2200);
    expect(bloco).toMatch(/code: "already_read"/);
    expect(bloco).toMatch(/\{ status: 409 \}/);
    expect(bloco).toMatch(/code: "not_found"/);
    expect(bloco).toMatch(/\{ status: 404 \}/);
  });

  it("nas duas línguas", () => {
    expect(rota).toMatch(/errorPt: "A clínica já viu esta mensagem\."/);
  });
});

describe("a tela oferece desfazer, e depois explica", () => {
  it("**o botão só aparece enquanto ninguém viu**", () => {
    expect(api).toMatch(/export function podeApagar/);
    expect(api).toMatch(/return m\.senderRole === "patient" && !m\.readAt;/);
    expect(tela).toMatch(/\{mine && podeApagar\(m\) && \(/);
  });

  it("e pergunta antes, porque não tem volta", () => {
    expect(tela).toMatch(/Alert\.alert\(ui\.undoAsk, ui\.undoAskBody/);
    expect(tela).toMatch(/style: "destructive"/);
  });

  it("**e o aviso diz que o áudio vai junto**", () => {
    // "Apagar a mensagem" faria pensar que o áudio fica.
    expect(tela).toMatch(/including the voice recording/);
    expect(tela).toMatch(/inclusive a gravação de voz/);
  });

  it("depois de vista, a bolha diz isso em vez de oferecer apagar", () => {
    expect(tela).toMatch(/\{mine && !podeApagar\(m\) && \(/);
    expect(tela).toMatch(/seenByClinic: "Seen by the clinic"/);
    expect(tela).toMatch(/seenByClinic: "Vista pela clínica"/);
  });

  it("e aponta a saída que existe", () => {
    expect(tela).toMatch(/sendCorrection: "Send a correction"/);
    expect(tela).toMatch(/sendCorrection: "Enviar uma correção"/);
  });

  it("**o 409 recarrega a conversa em vez de virar erro**", () => {
    // O `readAt` chega, e a bolha troca de estado sozinha: a tela passa a dizer
    // a verdade sem o paciente fazer nada.
    const i = tela.indexOf("const apagar = useMutation");
    const bloco = tela.slice(i, i + 900);
    expect(bloco).toMatch(/already_read/);
    expect(bloco).toMatch(/invalidateQueries\(\{ queryKey: \["messages"\] \}\)/);
  });

  it("e os textos existem nos dois idiomas, uma vez em cada", () => {
    for (const chave of ["undo", "undoAsk", "undoCancel", "undoConfirm", "seenByClinic", "tooLate"]) {
      expect((tela.match(new RegExp(`\\b${chave}:`, "g")) ?? []).length).toBe(2);
    }
  });
});
