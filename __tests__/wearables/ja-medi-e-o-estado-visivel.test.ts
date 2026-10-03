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
    /*
     * Pressão **e** ECG (122 T-2), sem fixar a ordem nem o espaçamento da
     * lista: o que importa é que os dois são pedidos.
     */
    expect(rota).toMatch(/kinds: \[[^\]]*"bp"[^\]]*\]/);
    expect(rota).toMatch(/kinds: \[[^\]]*"ecg"[^\]]*\]/);
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

  it("**e os desfechos têm frases diferentes, que se somam**", () => {
    // "Veio leitura mas fora da janela" e "não veio nada" são notícias
    // opostas: uma manda procurar na caixa de entrada, a outra manda esperar.
    //
    // Desde a 122 T-2 há uma terceira — o ECG — e o review de 03/10 apanhou-a
    // a **esconder** a da caixa de entrada, que é a única das três que pede uma
    // acção humana. Agora juntam-se em vez de competirem.
    expect(tela).toMatch(/if \(data\?\.ecg > 0\) partes\.push\(ui\.fetchedEcg\(data\.ecg\)\)/);
    expect(tela).toMatch(/if \(data\?\.lidas > 0\) partes\.push\(ui\.fetchedElsewhere\)/);
    expect(tela).toMatch(/partes\.length \? partes\.join\(" "\) : ui\.fetchedNone/);
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

  it("**janela fechada não busca** — nem cancelada, nem vencida", () => {
    // Sem isto o botão ia à Withings numa sessão cancelada, trazia a leitura,
    // jogava na caixa de entrada e respondia "encontrei" apontando para uma
    // janela que não existe mais. Achado do review de 27/09/2026.
    expect(rota).toMatch(/expireStaleSessions\(session\.connectionId\)/);
    expect(rota).toMatch(/session\.status === "OPEN" && session\.expiresAt\.getTime\(\) > Date\.now\(\)/);
    expect(rota).toMatch(/code: "session_closed"/);
  });

  it("e a recusa vem **antes** da ida à Withings", () => {
    // Ordem é a correção: verificar depois de buscar já teria gravado.
    expect(rota.indexOf('code: "session_closed"')).toBeLessThan(rota.indexOf("ingestWithings("));
  });

  it("**a Withings fora do ar não é 500 nosso**", () => {
    // Mesma palavra "erro" para o provedor caído e para defeito nosso deixava
    // o terapeuta apertando de novo sem saber qual dos dois era.
    expect(rota).toMatch(/counts = await ingestWithings\(/);
    expect(rota).toMatch(/code: "provider_unavailable"/);
    expect(rota).toMatch(/status: 502 \}/);
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
