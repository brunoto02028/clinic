/**
 * @jest-environment node
 *
 * A luz verde não mente (114 T-2).
 *
 * O Bruno, 30/09/2026: *"o estado da ligação não pode ser falso, não pode ter
 * uma luz verde dizendo que está conectado quando a verdade não está."*
 *
 * São **três** perguntas diferentes, e só a última é sobre hoje:
 *
 * | o que se olha | o que prova |
 * |---|---|
 * | `status: "CONNECTED"` | que alguém autorizou, **um dia** |
 * | `delivery` | que o provedor respondeu que vai avisar |
 * | a última **leitura** | que chegou dado |
 *
 * A tela do app já separava as duas primeiras. Faltava a terceira: uma ligação
 * podia estar `receiving` e **calada há uma semana**, e a tela pintava verde com
 * a legenda *"Último sync: hoje"* — que é quando falámos com o provedor, e
 * falamos com ele haja ou não haja medição.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const TELA = path.join(RAIZ, "mobile", "app", "(app)", "(clinica)", "wearables.tsx");
const ROTA = path.join(RAIZ, "app", "api", "wearables", "connections", "route.ts");

function semComentarios(p: string): string {
  return fs
    .readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("a tela do paciente", () => {
  it("**mostra a última leitura, e não o último sync**", () => {
    // `lastSyncedAt` acontece com ou sem dado. Era a linha que fazia dias de
    // silêncio parecerem um dia normal.
    const codigo = semComentarios(TELA);
    expect(codigo).toContain("lastReadingAt");
    expect(codigo).not.toMatch(/Último sync/);
  });

  it("**o silêncio conta como não-verde**", () => {
    // Uma ligação `receiving` e calada há dias continuava verde: o provedor
    // prometeu avisar, e ninguém perguntou se tinha avisado.
    const codigo = semComentarios(TELA);
    expect(codigo).toMatch(/conn\?\.silent === true/);
    // A condicao cresceu depois do QA: `quebrada` entrou quando se descobriu
    // que a ligacao em `ERROR` nem chegava a esta tela. O que o teste fixa e
    // que **o silencio continua a contar** — nao o numero de termos.
    expect(codigo).toMatch(/silent = isConnected &&[^;]*calada/);
  });

  it("**`unchecked` também não é verde**", () => {
    // "Nunca conseguimos confirmar" não é "está tudo bem".
    expect(semComentarios(TELA)).toMatch(/delivery === "unchecked"/);
  });

  it("e diz há quantos dias não chega nada", () => {
    expect(semComentarios(TELA)).toContain("daysSilent");
  });
});

describe("a rota manda o que a tela precisa", () => {
  it("**a data que significa dado**", () => {
    const codigo = semComentarios(ROTA);
    expect(codigo).toContain("lastReadingAt: c.lastReadingAt");
  });

  it("**o silêncio, com o limiar da clínica**", () => {
    // Não um número da tela: quem mede uma vez por semana não é quem mede toda
    // manhã, e a regra `WEARABLE_SILENCE` existe para isso.
    const codigo = semComentarios(ROTA);
    expect(codigo).toContain("silenceThreshold(");
    expect(codigo).toContain("isSilent(c, limite)");
    expect(codigo).toContain("silenceThreshold: limite");
  });

  it("continua a mandar o estado de entrega, que é outra pergunta", () => {
    expect(semComentarios(ROTA)).toContain("deliveryState(c)");
  });
});
