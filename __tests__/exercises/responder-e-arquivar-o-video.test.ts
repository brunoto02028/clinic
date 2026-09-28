import { lerCodigo } from "../helpers/codigo";

/**
 * Responder ao vídeo do paciente, e arquivá-lo (095 T-6, 27/09/2026).
 *
 * Pedido do Bruno: *"Quando o paciente enviar o vídeo e eu responder, quero
 * responder por texto ou com outro vídeo se for o caso, ou mesmo áudio. O vídeo
 * do paciente quero poder arquivar, para deixar o layout do dashboard mais
 * limpo."*
 *
 * As três formas de responder já existiam **separadas** — a conversa com o
 * paciente, a gravação de voz da 089, o upload de vídeo do exercício. O que
 * faltava era o lugar: junto do vídeo que se está assistindo.
 *
 * E arquivar precisava nascer com a distinção certa: **tirar da vista não é
 * apagar**. O vídeo é a execução de um exercício numa data, e some da lista sem
 * sair do prontuário.
 */

const painel = lerCodigo("components", "admin", "exercise-submissions-panel.tsx");
const rotaArquivo = lerCodigo("app", "api", "admin", "exercise-submissions", "[id]", "archive", "route.ts");
const rotaLista = lerCodigo("app", "api", "admin", "exercise-submissions", "route.ts");
const rotaReview = lerCodigo("app", "api", "admin", "exercise-submissions", "[id]", "review", "route.ts");
const schema = lerCodigo("prisma", "schema.prisma");
const arquivos = lerCodigo("lib", "patient-documents-shared.ts");
const contador = lerCodigo("lib", "clinic-waiting.ts");

describe("arquivar é tirar da vista, não apagar", () => {
  it("a rota marca uma data — não chama delete", () => {
    expect(rotaArquivo).toMatch(/archivedAt: arquivar \? new Date\(\) : null/);
    expect(rotaArquivo).not.toMatch(/\.delete\(|deleteMany/);
  });

  it("e dá para trazer de volta", () => {
    expect(rotaArquivo).toMatch(/body\?\.archived !== false/);
    expect(painel).toMatch(/Trazer de volta|Bring it back/);
    expect(painel).toMatch(/See archived|Ver arquivados/);
  });

  it("a lista esconde o arquivado por padrão", () => {
    expect(rotaLista).toMatch(/archivedAt: arquivados \? \{ not: null \} : null/);
  });

  it("e a clínica entra no where, sempre", () => {
    // Um id de outra clínica simplesmente não existe aqui.
    expect(rotaArquivo).toMatch(/clinicId: actor\.clinicId/);
  });

  it("o paciente não é avisado de arrumação nossa", () => {
    // "Sua gravação foi arquivada" soa como se algo tivesse sido perdido — e
    // é uma decisão de organização interna, não uma notícia sobre o tratamento.
    expect(rotaArquivo).not.toMatch(/push|notify/i);
  });
});

describe("responder por áudio ou vídeo", () => {
  it("a tela aceita o anexo junto do texto", () => {
    expect(painel).toMatch(/accept="audio\/\*,video\/\*"/);
    expect(painel).toContain("const [anexo, setAnexo]");
  });

  it("e a mídia vai pela rota de mensagens, que já guarda anexo", () => {
    // Reusar é o que faz a resposta chegar **onde o paciente lê**, em vez de
    // virar uma anotação que só a clínica vê.
    expect(painel).toMatch(/\/api\/admin\/patients\/\$\{patientId\}\/messages/);
    expect(painel).toMatch(/fd\.append\("file", arquivo\)/);
  });

  it("a mídia primeiro, a revisão depois", () => {
    /**
     * Se o anexo falhar, o envio continua na fila. Uma fila com um item a mais
     * é melhor que um paciente marcado como respondido sem ter recebido a
     * resposta que o terapeuta gravou.
     */
    const acao = painel.slice(painel.indexOf("const revisar = async"), painel.indexOf("const nomeDoExercicio"));
    expect(acao.indexOf("messages")).toBeLessThan(acao.indexOf("/review"));
  });

  it("e o card diz que houve resposta, e de que tipo", () => {
    // Áudio e vídeo não cabem numa anotação de texto: sem o rastro, o card
    // parece um "vi e não disse nada".
    expect(schema).toMatch(/replyKind String\?/);
    expect(rotaReview).toMatch(/body\?\.replyKind === "audio" \|\| body\?\.replyKind === "video"/);
    expect(painel).toMatch(/Respondido por áudio|Replied with audio/);
  });
});

describe("o que o QA da 095 achou, e foi consertado", () => {
  it("**o vídeo era recusado pelo servidor** (6.3)", () => {
    /**
     * A tela oferecia `accept="audio/*,video/*"`, o painel já calculava
     * `replyKind: "video"` — e `validatePatientFile` recusava todo `video/*`
     * com "Allowed: images, PDF, Word, TXT, CSV, voice message". Responder por
     * vídeo era impossível, e o terapeuta lia a frase de erro de
     * **carregamento**, que não diz que o arquivo foi recusado.
     */
    expect(arquivos).toMatch(/const video = rotulo\.startsWith\("video\/"\)/);
    expect(arquivos).toMatch(/!audio && !video &&/);
    expect(arquivos).toMatch(/VIDEO_MAX_BYTES/);
  });

  it("e a recusa do servidor chega à tela como ela é (6.3)", () => {
    expect(painel).toMatch(/erroDoServidor\?\.error/);
    expect(painel).not.toMatch(/throw new Error\(String\(up\.status\)\)/);
  });

  it("a prévia mostra o anexo que vai junto (6.7)", () => {
    // Ela dizia "sem texto — ele verá apenas que você assistiu" com uma
    // gravação de voz a caminho: mentia por omissão, e furava a regra de nada
    // chegar ao paciente sem quem envia ver o que sai.
    expect(painel).toMatch(/E este anexo:|And this attachment:/);
  });

  it("o texto também vai para a conversa (6.1)", () => {
    // Áudio e vídeo iam para a conversa e o texto ficava só no `reviewNote`:
    // duas formas de responder à mesma coisa chegando em dois lugares.
    expect(painel).toMatch(/if \(arquivo \|\| texto\)/);
  });

  it("e o contador solta o que foi arquivado", () => {
    // O badge dizia "Videos 4" sobre uma fila de 3 — e era um número que não
    // dava para zerar, porque o arquivado não aparece na fila para ser
    // revisado. O mesmo contador alimenta o e-mail diário da clínica.
    expect(contador).toMatch(/archivedAt: null/);
  });
});
