/**
 * @jest-environment node
 *
 * A assinatura da Withings é reconfirmada, e não confirmada uma vez na vida
 * (114 T-3).
 *
 * O Bruno, 30/09/2026: *"essa conexão eu quero ter certeza que não vai ser
 * perdida. Todos os dias, todas as horas, minutos."*
 *
 * A condição no cron era `!c.notifyCheckedAt`. Quer dizer: pergunta-se à
 * Withings se ela vai avisar **uma vez**, na primeira corrida, e nunca mais.
 * Depois disso o campo fica preenchido para sempre.
 *
 * Se a assinatura cair depois — por expiração, por revogação, ou porque o nosso
 * webhook respondeu errado uma vez e a Withings a desativou em silêncio, que é
 * o comportamento documentado dela — o silêncio dura para sempre. E a tela
 * continua a dizer *conectado*, com *last sync* de hoje, porque a varredura
 * diária continua a correr. Foi exatamente o quadro que o Bruno descreveu.
 *
 * Uma confirmação única não dá a certeza que ele pediu. Uma reconfirmação
 * periódica dá.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const CRON = path.join(RAIZ, "app", "api", "cron", "wearables-sync", "route.ts");

function fonte(): string {
  return fs.readFileSync(CRON, "utf8");
}

/** O código, sem os comentários — que aqui contam a história do defeito. */
function codigo(): string {
  return fonte()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("a reconfirmação existe", () => {
  it("**a condição não é mais `!notifyCheckedAt` sozinha**", () => {
    // A linha exata que fazia a confirmação valer para sempre: o `if` com corpo,
    // dentro do laço, a chamar `subscribeAndRecord`. A própria
    // `precisaReconfirmar` ainda testa `!c.notifyCheckedAt` — e deve testar,
    // é o primeiro dos três motivos —, mas com `return true` e sem chaves.
    // A primeira versão deste teste não fazia essa distinção e acusava a
    // correção como se fosse o defeito.
    expect(codigo()).not.toMatch(/if\s*\(\s*!c\.notifyCheckedAt\s*\)\s*\{/);
  });

  it("o cron decide por uma função nomeada, e não por uma condição solta", () => {
    expect(codigo()).toContain("precisaReconfirmar(c)");
  });

  it("**a consulta traz o que a decisão precisa de ler**", () => {
    // Sem `notifyConfirmedAppli` no `select`, `deliveryState` lê `undefined` e
    // devolve "silent" para toda a gente: reconfirmaria sempre, por uma razão
    // falsa, e o teste de cima passaria na mesma.
    expect(codigo()).toContain("notifyConfirmedAppli: true");
  });
});

describe("os três motivos para perguntar de novo", () => {
  // A função vive no arquivo da rota, então é lida como texto. O que se cobra
  // aqui é que os três ramos existam — o comportamento de cada um está em
  // `deliveryState`, que tem teste próprio.
  const fn = () => {
    const c = codigo();
    const i = c.indexOf("function precisaReconfirmar");
    expect(i).toBeGreaterThan(0);
    return c.slice(i, i + 700);
  };

  it("**nunca perguntamos** — o caso original", () => {
    expect(fn()).toMatch(/if\s*\(!c\.notifyCheckedAt\)\s*return true/);
  });

  it("**a resposta era incompleta** — `partial` ou `silent`", () => {
    // O caso que mais importa para o Bruno: a Withings confirma a pressão e
    // não confirma o sono, e o produto conclui que está tudo bem.
    expect(fn()).toContain("deliveryState(c)");
    expect(fn()).toMatch(/!==\s*"receiving"/);
  });

  it("**a resposta está velha** — e a validade é declarada, não mágica", () => {
    expect(fn()).toContain("CONFIRMACAO_VALE_MS");
    expect(codigo()).toMatch(/CONFIRMACAO_VALE_MS\s*=\s*\d+\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it("**a validade não é maior que o intervalo do cron**", () => {
    // O cron corre de 2 em 2 horas. Uma validade maior que isso significa
    // reconfirmar em corridas alternadas — e foi o que aconteceu: o número
    // estava em 12 e o limitador real era o cron, não ele. Se alguém voltar a
    // subir este valor sem mexer no agendamento, isto cai.
    const m = codigo().match(/CONFIRMACAO_VALE_MS\s*=\s*(\d+)\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
    expect(m).toBeTruthy();
    expect(Number(m![1])).toBeLessThanOrEqual(2);
  });
});
