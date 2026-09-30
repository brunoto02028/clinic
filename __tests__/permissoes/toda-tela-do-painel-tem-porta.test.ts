/**
 * @jest-environment node
 *
 * Toda tela do painel tem porta (105 T-5).
 *
 * O Bruno, 30/09/2026: *"a página blood pressure não aparece na área da clinic
 * mas aparece no app."*
 *
 * A tela existia desde a atividade 069. O que não existia era o caminho até ela:
 * estava no `admin-sidebar.old.tsx`, o menu **antigo**, e não veio na troca para
 * `lib/admin-sections.ts`. Só abria por URL digitada.
 *
 * ## A varredura achou cinco, e ele tinha visto uma
 *
 * | tela | estado |
 * |---|---|
 * | `/admin/blood-pressure` | **sem porta nenhuma** — corrigida |
 * | `/admin/body-assessments` | **sem porta nenhuma** |
 * | `/admin/marketing/content-intelligence` | **sem porta nenhuma** |
 * | `/admin/marketplace/pdf-creator` | alcançável por link de outra tela |
 * | `/admin/media` | alcançável por link de outra tela |
 *
 * E a varredura achou uma quinta que o menu antigo **também** não tinha:
 * `/admin/marketplace/orders`. Essa nunca teve porta em lado nenhum, e a tela do
 * marketplace já lê os pedidos pela mesma API — o que sugere que a função dela
 * vive noutro sítio.
 *
 * É a terceira vez este mês que esta casa encontra *"o recurso existia e não
 * tinha porta"* — a tela de quem eu cuido, a lista de atribuições do education,
 * e agora estas. É por isso que esta varredura existe em vez de uma correção
 * solta: a próxima perde-se igual.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

/**
 * As que já estavam perdidas quando a varredura nasceu.
 *
 * **Não é uma absolvição** — é uma linha de base, e o Bruno ainda vai decidir o
 * que fazer com elas. O que a lista garante é que o número só pode **descer**:
 * uma tela nova que nasça sem porta derruba o teste, em vez de se juntar
 * silenciosamente a estas.
 */
const SEM_PORTA_CONHECIDAS = [
  "/admin/body-assessments",
  "/admin/marketing/content-intelligence",
  // Esta **nunca esteve em menu nenhum** — nem no antigo. E a tela do
  // marketplace ja busca os pedidos pela mesma API, entao a funcao dela parece
  // viver noutro lugar. Nao e uma tela perdida na troca: e uma que talvez nao
  // devesse existir. Fica declarada ate alguem decidir.
  "/admin/marketplace/orders",
];

/** Todas as telas que existem em `app/admin`, sem as rotas dinâmicas. */
function telas(): string[] {
  const achadas: string[] = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        anda(p);
        continue;
      }
      if (nome !== "page.tsx") continue;
      const rota = "/" + path.relative(path.join(RAIZ, "app"), dir).split(path.sep).join("/");
      // As dinâmicas (`[id]`) alcançam-se a partir de uma lista, nunca do menu.
      if (!rota.includes("[")) achadas.push(rota);
    }
  };
  anda(path.join(RAIZ, "app", "admin"));
  return achadas;
}

/** As rotas que o menu em uso oferece. */
function noMenu(): Set<string> {
  const fonte = fs.readFileSync(path.join(RAIZ, "lib", "admin-sections.ts"), "utf8");
  const rotas = new Set<string>();
  for (const m of fonte.matchAll(/href:\s*"(\/admin[^"]*)"/g)) rotas.add(m[1]);
  for (const m of fonte.matchAll(/matchRoutes:\s*\[([^\]]*)\]/g)) {
    for (const r of m[1].matchAll(/"(\/admin[^"]*)"/g)) rotas.add(r[1]);
  }
  return rotas;
}

/** Ligada a partir de alguma outra tela — o outro jeito legítimo de se chegar. */
function ligadaDeOutraTela(rota: string): boolean {
  const alvo = new RegExp(`["'\`]${rota.replace(/\//g, "\\/")}(["'\`/?])`);
  const anda = (dir: string): boolean => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        if (anda(p)) return true;
        continue;
      }
      if (!/\.tsx?$/.test(nome)) continue;
      const rel = path.relative(RAIZ, p).split(path.sep).join("/");
      // A própria tela não conta, nem o menu antigo, que é o que se perdeu.
      if (rel.startsWith("app" + rota)) continue;
      if (rel.includes("admin-sidebar.old")) continue;
      const fonte = fs.readFileSync(p, "utf8");
      if (alvo.test(fonte.replace(/\/api\/admin/g, "/API_ADMIN"))) return true;
    }
    return false;
  };
  return anda(path.join(RAIZ, "app")) || anda(path.join(RAIZ, "components"));
}

describe("nenhuma tela do painel fica sem caminho", () => {
  it("**a pressão arterial está no menu**", () => {
    // Era a que o Bruno viu. A tela existia desde a 069 e só abria por URL.
    expect(noMenu().has("/admin/blood-pressure")).toBe(true);
  });

  it("**nenhuma tela nova nasce sem porta**", () => {
    const menu = noMenu();
    const perdidas = telas().filter(
      (r) => !menu.has(r) && !SEM_PORTA_CONHECIDAS.includes(r) && !ligadaDeOutraTela(r)
    );
    expect(perdidas).toEqual([]);
  });

  it("**a lista de conhecidas só pode encolher**", () => {
    // Se alguém acrescentar uma tela aqui em vez de lhe dar caminho, isto cai.
    expect(SEM_PORTA_CONHECIDAS).toHaveLength(3);
  });

  it("e as conhecidas continuam a ser as que foram declaradas", () => {
    // Uma que ganhe caminho deve sair da lista. Enquanto estiver aqui, tem de
    // continuar sem caminho — senão a lista mente sobre o estado do painel.
    const menu = noMenu();
    for (const r of SEM_PORTA_CONHECIDAS) {
      expect(menu.has(r)).toBe(false);
    }
  });

  it("a varredura lê mesmo as telas — senão aprova o vazio", () => {
    expect(telas().length).toBeGreaterThan(30);
  });
});
