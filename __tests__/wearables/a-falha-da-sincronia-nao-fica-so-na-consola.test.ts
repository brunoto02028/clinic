/**
 * @jest-environment node
 *
 * A falha da sincronia não fica só na consola (achado do Bruno, 01/10).
 *
 * Ele abriu a caixa de medições em produção e a tela disse três coisas
 * verdadeiras:
 *
 * > Clinic device connected · **Nothing has arrived from this device in 6
 * > days** · Last reading received: 24/09/2026, 21:03 · **Withings has
 * > confirmed it will send blood pressure.**
 * >
 * > *Nothing waiting. Every reading found its record.*
 *
 * E a medição dele de 30/09 estava bem visível na app da Withings.
 *
 * ## Três factos que, juntos, não apontam para lado nenhum
 *
 * A caixa vazia elimina a atribuição. A assinatura confirmada elimina o
 * webhook não assinado. Sobra a pergunta que a tela **não fazia**: *nós
 * chegámos a pedir?* — e, se pedimos, *o que é que eles responderam?*
 *
 * Porque "não pedimos" e "pedimos e não veio" exigem consertos opostos, e daí
 * eram indistinguíveis.
 *
 * ## Porque a resposta não existia em lado nenhum
 *
 * O cron apanha o erro por ligação — de propósito, para que o token vencido de
 * um paciente não pare a sincronia dos outros — e escreve-o com
 * `console.error`. **A consola do contentor devolve 13 linhas de arranque.**
 *
 * Uma falha que só existe lá é uma falha que não existe: a tela diz
 * "conectado", nenhum alerta dispara, e quem procura a leitura descobre dias
 * depois. É a forma pura do defeito que este dia inteiro perseguiu — o silêncio
 * que parece sucesso.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function codigo(...partes: string[]): string {
  return fs
    .readFileSync(path.join(RAIZ, ...partes), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const CRON = ["lib", "wearables-sync-run.ts"];
const CAIXA = ["app", "admin", "measurements", "inbox", "page.tsx"];

describe("o erro é gravado, e não só impresso", () => {
  it("**o schema tem onde o guardar**", () => {
    const s = fs.readFileSync(path.join(RAIZ, "prisma", "schema.prisma"), "utf8");
    expect(s).toMatch(/lastSyncError\s+String\?/);
    expect(s).toMatch(/lastSyncErrorAt\s+DateTime\?/);
  });

  it("**o cron escreve a mensagem quando falha**", () => {
    const c = codigo(...CRON);
    expect(c).toMatch(/lastSyncError: String\(err\?\.message \?\? err\)/);
    expect(c).toMatch(/lastSyncErrorAt: new Date\(\)/);
  });

  it("**e continua a escrever na consola também**", () => {
    // A consola serve para quem está a ver no momento; a coluna serve para
    // quem chega depois. Trocar uma pela outra seria perder metade.
    expect(codigo(...CRON)).toMatch(/console\.error\(`\[cron\/wearables-sync\] connection/);
  });

  it("**o sucesso apaga o erro anterior**", () => {
    // Um erro que fica depois de resolvido mente tanto quanto um que nunca
    // aparece — e é pior, porque manda procurar o que já não existe.
    const c = codigo(...CRON);
    expect(c).toMatch(/lastSyncError: null, lastSyncErrorAt: null/);
  });

  it("**e a falha de gravar o erro não derruba a sincronia**", () => {
    // O trabalho é sincronizar; anotar a falha é o acessório. Se o acessório
    // rebentar, a corrida dos outros pacientes continua.
    const c = codigo(...CRON);
    const i = c.indexOf("lastSyncError: String(");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i, i + 300)).toContain(".catch(() => {})");
  });
});

describe("a caixa faz a quarta pergunta", () => {
  it("**diz quando falámos com a Withings pela última vez**", () => {
    const c = codigo(...CAIXA);
    expect(c).toContain("device.lastSyncedAt");
    expect(c).toMatch(/We last asked Withings|Perguntámos à Withings/);
  });

  it("**e diz quando nunca completámos uma sincronia**", () => {
    // O caso mais informativo de todos, e o que não tinha como aparecer.
    const c = codigo(...CAIXA);
    expect(c).toMatch(/never completed a sync|Nunca completámos/);
  });

  it("**mostra o erro, quando houve um**", () => {
    const c = codigo(...CAIXA);
    expect(c).toContain("device.lastSyncError");
    expect(c).toMatch(/last attempt failed|última tentativa falhou/);
  });

  it("**e a rota manda os três campos**", () => {
    // Sem eles no `select` do seletor, a tela lê `undefined` e volta a não
    // dizer nada — calada do mesmo jeito, por outro motivo.
    const sel = codigo("lib", "clinic-device.ts");
    expect(sel).toMatch(/lastSyncedAt: true, lastSyncError: true, lastSyncErrorAt: true/);
    const rota = codigo("app", "api", "admin", "measurement-sessions", "route.ts");
    expect(rota).toContain("lastSyncError: device.lastSyncError");
  });
});
