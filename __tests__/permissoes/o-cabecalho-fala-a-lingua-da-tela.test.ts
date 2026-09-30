/**
 * @jest-environment node
 *
 * Os cabeçalhos de categoria, na língua da tela (112 T-1, passo 5).
 *
 * O QA apanhou `CLINICAL` numa tela inteiramente em português. A causa não era
 * um esquecimento de tradução: a tela de permissões do paciente tinha um
 * **catálogo próprio** de categorias, escrito à mão, sem coluna em português.
 *
 * E os dois já tinham divergido sem ninguém notar:
 *
 * | | a tela | o catálogo |
 * |---|---|---|
 * | core | Main (Always Visible) | Core (Always Visible) |
 * | wellness | Wellbeing & Self-Care | Wellness & Self-Care |
 * | booking | Bookings | Booking |
 *
 * É a mesma história do `classifyBP` do painel da pressão, no mesmo dia: duas
 * listas com o mesmo assunto acabam a discordar, e a discordância aparece na
 * frente de quem usa.
 */

import * as fs from "fs";
import * as path from "path";
import { MODULE_CATEGORIES, PERMISSION_CATEGORIES } from "@/lib/module-registry";

const RAIZ = path.join(__dirname, "..", "..");

/**
 * A tela de preços é **inglês inteiro** — nomes dos módulos, botões, tudo.
 *
 * Traduzir só o cabeçalho ali deixaria um título em português por cima de uma
 * lista em inglês, que é pior que os dois em inglês. Ela entra na revisão de
 * EN+PT da tela toda, e não aqui.
 *
 * A exceção é **uma**, e nomeada: um segundo arquivo nesta lista derruba o teste
 * de baixo, de propósito.
 */
const SO_EM_INGLES = ["app/admin/service-pricing/page.tsx"];

function arquivosDoPainel(): string[] {
  const achados: string[] = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        anda(p);
        continue;
      }
      if (/\.tsx$/.test(nome)) achados.push(p);
    }
  };
  anda(path.join(RAIZ, "app", "admin"));
  return achados;
}

/** O caminho como se escreve numa lista: com barras, a partir da raiz. */
function relativo(p: string): string {
  return p.slice(RAIZ.length + 1).split(path.sep).join("/");
}

/**
 * As telas que desenham **estes** cabeçalhos, e não as que têm um `cat` qualquer.
 *
 * A primeira versão desta varredura procurava `{cat.label}` em todo o painel e
 * acusou a tela de tratamentos, que tem categorias **de tratamento** — assunto
 * diferente, catálogo diferente, e nenhum português a dever. Uma varredura que
 * acusa inocente é uma varredura que se desliga.
 */
function telasQueUsamOCatalogo(): string[] {
  return arquivosDoPainel().filter((p) =>
    /import\s*\{[^}]*(MODULE_CATEGORIES|PERMISSION_CATEGORIES)[^}]*\}\s*from\s*"@\/lib\/module-registry"/s.test(
      fs.readFileSync(p, "utf8")
    )
  );
}

describe("o catálogo de categorias é um só", () => {
  it("**nenhuma tela declara o próprio `MODULE_CATEGORIES`**", () => {
    // Uma cópia local não fica igual: esta ficou com `Main` onde o catálogo diz
    // `Core`, e com `Wellbeing` onde ele diz `Wellness`.
    const culpadas = arquivosDoPainel().filter((p) =>
      /const\s+(MODULE_CATEGORIES|PERM_CATEGORIES|PERMISSION_CATEGORIES)\s*=/.test(
        fs.readFileSync(p, "utf8")
      )
    );
    expect(culpadas.map(relativo)).toEqual([]);
  });

  it("a varredura lê mesmo o painel — senão aprova o vazio", () => {
    expect(arquivosDoPainel().length).toBeGreaterThan(20);
  });

  it("todo grupo do catálogo tem as duas línguas", () => {
    for (const c of [...MODULE_CATEGORIES, ...PERMISSION_CATEGORIES]) {
      expect(c.label.trim()).toBeTruthy();
      expect(c.labelPt.trim()).toBeTruthy();
    }
  });
});

describe("o cabeçalho traduz", () => {
  it("**nenhuma tela desenha `cat.label` cru**", () => {
    // `{cat.label}` é sempre o inglês. O que a tela tem de desenhar é a escolha
    // pela língua da sessão — `rlabel(cat.label, cat.labelPt)` ou o ternário.
    const culpadas = telasQueUsamOCatalogo()
      .filter((p) => !SO_EM_INGLES.includes(relativo(p)))
      .filter((p) => /\{cat\.label\}/.test(fs.readFileSync(p, "utf8")));
    expect(culpadas.map(relativo)).toEqual([]);
  });

  it("a varredura acha as telas que usam o catálogo — senão aprova o vazio", () => {
    expect(telasQueUsamOCatalogo().length).toBeGreaterThanOrEqual(3);
  });

  it("**a exceção é uma só, e continua a ser a que foi declarada**", () => {
    // Se alguém acrescentar um arquivo à lista de cima em vez de traduzir, isto
    // cai — que é o único jeito de a exceção não virar a regra.
    expect(SO_EM_INGLES).toHaveLength(1);
    const fonte = fs.readFileSync(path.join(RAIZ, ...SO_EM_INGLES[0].split("/")), "utf8");
    expect(fonte).toContain("{cat.label}");
  });

  it("a tela de permissões do paciente escolhe pela língua", () => {
    const fonte = fs.readFileSync(
      path.join(RAIZ, "app", "admin", "patients", "[id]", "permissions", "page.tsx"),
      "utf8"
    );
    expect(fonte).toContain("rlabel(cat.label, cat.labelPt)");
  });
});
