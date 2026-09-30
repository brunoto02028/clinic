/**
 * @jest-environment node
 *
 * A paleta crua só pode descer (116 T-1).
 *
 * O Bruno mandou uma captura do painel com duas palavras: *"cores ruins"*.
 *
 * ## O mecanismo, que não é o óbvio
 *
 * Eu ia registar isto como *"falta o dark mode"*. Está errado, e é importante
 * que esteja: **o painel é escuro por padrão**. O `:root` do `globals.css` *é* o
 * tema escuro do admin, e é a área do paciente que é clara. Não existe classe
 * `.dark` a ser ligada, então `dark:bg-…` não faria **nada**.
 *
 * O que acontece é a mistura:
 *
 * | a peça | de onde vem a cor | resultado |
 * |---|---|---|
 * | `bg-amber-50` | paleta crua, clara, fixa | caixa creme |
 * | `text-muted-foreground` | token — e o token é do tema **escuro** | texto cinza claro |
 *
 * **Fundo cru claro + texto por token escuro = texto invisível.** É a caixa da
 * captura dele, exatamente.
 *
 * ## Por que uma trava, e não só uma correção
 *
 * São 608 ocorrências em 59 arquivos. Corrigir as sete piores e ir embora deixa
 * a oitava nascer errada na semana seguinte — que foi como as 608 chegaram aqui.
 *
 * A linha de base **não é uma absolvição**: é um número que só pode descer.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const PAINEL = path.join(RAIZ, "app", "admin");

/**
 * O número de hoje, medido em 30/09/2026.
 *
 * Quando descer, esta constante desce com ele — e o teste que a guarda impede
 * que ela suba por descuido.
 */
const TETO = 608;

/**
 * As cores cruas **claras** de Tailwind.
 *
 * Os tons 50, 100 e 200 são os que assumem um fundo claro. Os escuros (600+)
 * não entram: `bg-red-600` num selo cheio é uma escolha de desenho que funciona
 * nos dois temas, e proibi-la seria proibir a cor em vez do problema.
 */
const CRUA =
  /\b(?:bg|text|border)-(?:amber|red|blue|emerald|orange|green|yellow|slate|violet|purple|pink|indigo|teal|cyan|rose|lime|fuchsia|sky|stone|zinc|neutral|gray)-(?:50|100|200)\b/g;

function telas(): string[] {
  const achadas: string[] = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        anda(p);
        continue;
      }
      if (nome.endsWith(".tsx")) achadas.push(p);
    }
  };
  anda(PAINEL);
  return achadas;
}

function quantas(p: string): number {
  return (fs.readFileSync(p, "utf8").match(CRUA) ?? []).length;
}

function total(): number {
  return telas().reduce((s, p) => s + quantas(p), 0);
}

describe("o painel é escuro, e a paleta crua é clara", () => {
  it("**o tema do painel vive no `:root`, e não numa classe `.dark`**", () => {
    // É o que torna `dark:bg-…` inútil aqui, e é a razão de o conserto ser
    // token e não variante. Se alguém mudar isto, o desenho inteiro desta
    // atividade muda com ele.
    const css = fs.readFileSync(path.join(RAIZ, "app", "globals.css"), "utf8");
    expect(css).toMatch(/ADMIN \(dark\)/i);
    expect(css).toContain(".public-site");
  });

  it("**os tokens existem** — o conserto é usá-los, não inventá-los", () => {
    const css = fs.readFileSync(path.join(RAIZ, "app", "globals.css"), "utf8");
    for (const token of ["--ba1-ok", "--ba1-warn", "--ba1-bad", "--ba1-health"]) {
      expect(css).toContain(token);
    }
  });
});

describe("a conta só pode descer", () => {
  it("**o total não passa do teto**", () => {
    const agora = total();
    expect(agora).toBeLessThanOrEqual(TETO);
  });

  it("**e quando descer, o teto desce junto**", () => {
    // Sem isto a folga acumula: alguém corrige trinta, o teto fica trinta
    // acima, e as trinta seguintes entram sem ninguém reparar. A folga tem de
    // ser zero para a trava continuar a morder.
    const agora = total();
    expect(TETO - agora).toBeLessThanOrEqual(0);
  });

  it("a varredura lê mesmo as telas — senão aprova o vazio", () => {
    expect(telas().length).toBeGreaterThan(40);
  });

  it("e conta mesmo as ocorrências — senão o teto é decorativo", () => {
    expect(total()).toBeGreaterThan(100);
  });
});
