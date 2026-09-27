/**
 * @jest-environment node
 *
 * "Já medi — busca agora", e o estado que a tela escondia (092 T-2 e T-3).
 *
 * ## O que aconteceu de verdade
 *
 * O Bruno mediu pressão por semanas sem receber uma leitura sequer no app do
 * paciente. A caixa de entrada estava **vazia** — ou seja, nada chegava — e a
 * tela dizia apenas *"aparelho da clínica conectado"*.
 *
 * Duas coisas conspiravam:
 *
 * 1. **A tela de medição só escutava.** Abria a janela e consultava a cada três
 *    segundos até a Withings resolver nos avisar. Notificação que não vem =
 *    espera infinita, e ninguém descobre.
 * 2. **O estado de entrega só aparecia quando era ruim.** `receiving` e
 *    `unchecked` não desenhavam nada, então "está tudo certo" e "não fazemos
 *    ideia" eram visualmente idênticos.
 *
 * **Silêncio que parece sucesso é pior que erro**, e é isso que estes testes
 * guardam.
 */

import { ler } from "../helpers/codigo";

describe("a tela deixou de só escutar", () => {
  const rota = ler("app", "api", "admin", "measurement-sessions", "[id]", "fetch", "route.ts");
  const tela = ler("components", "admin", "clinic-measurement-button.tsx");

  it("existe um caminho que **puxa** da Withings", () => {
    expect(rota).toMatch(/export async function POST/);
    expect(rota).toMatch(/ingestWithings\(/);
    expect(rota).toMatch(/kinds: \["bp"\]/);
  });

  it("e a tela o oferece enquanto espera", () => {
    expect(tela).toMatch(/const buscarAgora = async/);
    expect(tela).toMatch(/measurement-sessions\/\$\{session\.id\}\/fetch/);
    expect(tela).toMatch(/fetchNow: "Já medi"/);
  });

  it("a janela pedida tem folga dos dois lados", () => {
    // O relógio do manguito não é o nosso, e a pessoa toca no botão **depois**
    // de medir — a medida pode ter caído um instante antes de a sessão abrir.
    expect(rota).toMatch(/FOLGA_MS = 5 \* 60 \* 1000/);
    expect(rota).toMatch(/openedAt\.getTime\(\) - FOLGA_MS/);
  });

  it("**e os três desfechos têm frases diferentes**", () => {
    // "Veio leitura mas fora da janela" e "não veio nada" são notícias
    // opostas: uma manda procurar na caixa de entrada, a outra manda esperar.
    expect(tela).toMatch(/data\?\.lidas > 0 \? ui\.fetchedElsewhere : ui\.fetchedNone/);
    expect(tela).toMatch(/fetchedElsewhere: "Chegou uma leitura, mas fora desta janela/);
    expect(tela).toMatch(/fetchedNone: "Nada veio do aparelho ainda/);
  });

  it("aparelho desconectado diz o que fazer, nas duas línguas", () => {
    expect(rota).toMatch(/code: "device_disconnected"/);
    expect(rota).toMatch(/errorPt: "O aparelho não está conectado\. Reconecte em Configurações\."/);
  });

  it("sessão de outra clínica responde como inexistente", () => {
    expect(rota).toMatch(/session\.clinicId !== actor\.clinicId/);
    expect(rota).toMatch(/status: 404/);
  });

  it("e sem sessão de equipe, nada", () => {
    expect(rota).toMatch(/if \(!actor\) return NextResponse\.json\(\{ error: "Unauthorized" \}/);
  });
});

describe("o estado de entrega aparece sempre, não só quando ruim", () => {
  const api = ler("app", "api", "admin", "measurement-sessions", "route.ts");
  const tela = ler("app", "admin", "measurements", "inbox", "page.tsx");

  it("a rota devolve os três dados que respondem 'por que nada chega?'", () => {
    expect(api).toMatch(/lastReadingAt: device\.lastReadingAt/);
    expect(api).toMatch(/checkedAt: device\.notifyCheckedAt/);
    expect(api).toMatch(/confirmedAppli: device\.notifyConfirmedAppli/);
  });

  it("**a última leitura aparece sempre** — é a linha que teria contado tudo", () => {
    expect(tela).toMatch(/data-testid="device-last-reading"/);
    expect(tela).toMatch(/lastReadingNever: "Nenhuma leitura chegou deste aparelho até hoje\."/);
  });

  it("`receiving` passa a dizer que está recebendo", () => {
    // Antes não desenhava nada, e o silêncio era lido como sucesso.
    expect(tela).toMatch(/device\.delivery === "receiving" && \(/);
    expect(tela).toMatch(/data-testid="device-delivery-ok"/);
  });

  it("e **`unchecked` deixa de parecer sucesso**", () => {
    expect(tela).toMatch(/device\.delivery === "unchecked" && \(/);
    expect(tela).toMatch(/deliveryUnchecked: "Ainda não confirmamos com a Withings/);
  });

  it("com um caminho de conserto ao lado, não só um aviso", () => {
    // Aviso que não oferece saída é aviso que irrita.
    const i = tela.indexOf('data-testid="device-delivery-unchecked"');
    expect(tela.slice(i, i + 900)).toMatch(/wearables\/resubscribe/);
    expect(tela).toMatch(/checkNow: "Conferir agora"/);
  });

  it("e tudo nas duas línguas", () => {
    for (const chave of ["deliveryOk", "deliveryUnchecked", "lastReading", "lastReadingNever", "checkNow"]) {
      // Uma vez em cada bloco de idioma.
      expect((tela.match(new RegExp(`${chave}:`, "g")) ?? []).length).toBe(2);
    }
  });
});
