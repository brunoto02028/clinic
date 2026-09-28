/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { raiz, semComentarios } from "../helpers/codigo";

/**
 * Toda tela do painel tem caminho? (100 T-4, 28/09/2026)
 *
 * ## Por que este teste existe
 *
 * Em 28/09 o Bruno tentou usar quatro funcionalidades entregues e não chegou a
 * nenhuma: a seção educacional, a tela de atribuir material, o biohacking e,
 * antes delas, a consulta por vídeo. **Nenhuma estava quebrada.** Nenhuma
 * tinha caminho.
 *
 * Três atividades seguidas terminaram assim, e o padrão é sempre o mesmo:
 * "entregue" significando *"a rota responde"* em vez de *"alguém chega lá"*.
 * Quem paga esse preço é ele, procurando.
 *
 * Isto é mecanizável, então passa a ser mecânico: as telas que existem em
 * `app/admin` contra as rotas que o menu cita. O que sobra tem de estar na
 * lista de exceções abaixo, **com motivo escrito**.
 *
 * ## O que conta como caminho
 *
 * Uma entrada no menu, ou um link a partir de outra tela viva — a lista que
 * leva ao detalhe é caminho legítimo.
 *
 * **`admin-sidebar.old.tsx` não conta.** Ele não é mais usado, e foi
 * exatamente ele que deu a falsa impressão de que a educação estava no menu:
 * era o único arquivo que a citava.
 */

const ADMIN = path.join(raiz, "app", "admin");

function telasDe(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...telasDe(path.join(dir, e.name), `${base}/${e.name}`));
    else if (e.name === "page.tsx") out.push(base);
  }
  return out;
}

function arquivosVivos(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules") continue;
      out.push(...arquivosVivos(p));
    } else if (/\.(tsx|ts)$/.test(e.name) && !e.name.includes(".old.")) {
      out.push(p.split(path.sep).join("/"));
    }
  }
  return out;
}

/**
 * As telas que existem e **ninguém alcança** — conhecidas, com o motivo.
 *
 * Isto não é uma lista de perdão: é o retrato do que estava assim quando a
 * varredura nasceu. Cada linha é uma decisão a tomar — pôr no menu, ligar a
 * partir de alguma tela, ou apagar.
 */
const SEM_CAMINHO_CONHECIDAS: Record<string, string> = {
  // Sub-telas do paciente. Nao podem virar entrada de menu — nao existe menu
  // sem um paciente escolhido —, entao o caminho delas e um link na ficha
  // dele. Ainda nao existe.
  "/admin/patients/[id]/documents": "a ficha do paciente nao leva ate ela",
  "/admin/patients/[id]/permissions": "a ficha do paciente nao leva ate ela",
  "/admin/patients/[id]/report": "a ficha abre a API do relatorio, nao esta tela",

  // Sub-tela de `/admin/scans`, alcancada a partir dela quando aquela tela
  // ganhar o link. Entrou no menu como parte de "Scans".
  "/admin/scans/report-preview": "previa alcancada a partir de /admin/scans",
};

describe("toda tela do painel tem caminho", () => {
  const telas = telasDe(ADMIN)
    .map((p) => `/admin${p}`)
    .sort();

  const nav = fs.readFileSync(path.join(raiz, "lib", "admin-sections.ts"), "utf8");
  /**
   * **Só `href:` conta como caminho.**
   *
   * A primeira versão desta varredura aceitava qualquer `/admin/...` citado no
   * arquivo — e `matchRoutes` é outra coisa: ele **acende a seção** quando
   * você já está na tela, e não leva a lugar nenhum.
   *
   * Foi assim que `/admin/video-consultations` passou pela varredura: citada
   * em `matchRoutes`, sem aba nenhuma. O Bruno perguntou duas vezes onde ela
   * ficava, e a suite dizia que estava tudo bem.
   */
  const citadas = new Set(
    [...nav.matchAll(/href:\s*["'](\/admin[^"']*)["']/g)].map((m) => m[1])
  );

  const vivos = [
    ...arquivosVivos(path.join(raiz, "app")),
    ...arquivosVivos(path.join(raiz, "components")),
  ]
    // Uma rota de API não é um link: ninguém navega para ela.
    .filter((f) => !f.includes("/app/api/"));
  /**
   * **Menção em comentário não é link.**
   *
   * `app/admin/appointments/page.tsx` cita `/admin/video-consultations` duas
   * vezes — as duas explicando por que algo mudou. A varredura contou como
   * caminho, e não havia caminho nenhum.
   */
  const conteudo = vivos.map(
    (f) => [f, semComentarios(fs.readFileSync(f, "utf8"))] as const
  );

  /** O caminho sem os segmentos dinâmicos — é assim que o menu o cita. */
  const estatico = (t: string) => t.split("/").filter((s) => !s.startsWith("[")).join("/");

  /**
   * Alguma tela viva leva até esta?
   *
   * Para uma tela dinâmica, o código escreve `` `/admin/patients/${id}/x` `` —
   * o caminho literal com `[id]` nunca aparece, então a busca é pelo prefixo
   * mais a interpolação.
   */
  function alguemLinka(t: string): boolean {
    const propria = `${raiz.split(path.sep).join("/")}/app${t}`;
    const partes = t.split("/");
    const i = partes.findIndex((s) => s.startsWith("["));

    if (i === -1) {
      return conteudo.some(([f, c]) => !f.startsWith(propria) && c.includes(t));
    }

    const prefixo = `${partes.slice(0, i).join("/")}/`;
    const sufixo = partes.slice(i + 1).join("/");
    return conteudo.some(([f, c]) => {
      if (f.startsWith(propria)) return false;
      const idx = c.indexOf(`${prefixo}\${`);
      if (idx === -1) return false;
      if (!sufixo) return true;
      return c.slice(idx, idx + 400).includes(`}/${sufixo}`);
    });
  }

  const semCaminho = telas.filter((t) => !citadas.has(estatico(t)) && !alguemLinka(t));

  it("a varredura encontra as telas do painel", () => {
    // Uma varredura que não acha nada passaria sempre, e não protegeria nada.
    expect(telas.length).toBeGreaterThan(50);
    expect(telas).toContain("/admin/education");
    expect(telas).toContain("/admin/biohacking");
  });

  it("**nenhuma tela nova sem caminho**", () => {
    /**
     * Esta é a asserção inteira desta tarefa.
     *
     * Quando ela falhar, a tela nova tem menu, ou tem link a partir de outra,
     * ou entra na lista com o motivo. O que não acontece mais é chegar ao
     * Bruno como "está pronto" e ele não conseguir abrir.
     */
    const novas = semCaminho.filter((t) => !(t in SEM_CAMINHO_CONHECIDAS));
    expect(novas).toEqual([]);
  });

  it("e a lista de conhecidas não guarda o que já foi resolvido", () => {
    // Uma exceção que sobrevive ao conserto vira permissão permanente.
    const resolvidas = Object.keys(SEM_CAMINHO_CONHECIDAS).filter((t) => !semCaminho.includes(t));
    expect(resolvidas).toEqual([]);
  });

  it("**o que o Bruno procurou hoje tem caminho**", () => {
    for (const t of [
      "/admin/education",
      "/admin/education/assignments",
      "/admin/biohacking",
    ]) {
      expect(semCaminho).not.toContain(t);
    }
  });

  it("e o menu antigo não conta como caminho", () => {
    // Foi ele que deu a falsa impressão de que a educação estava no menu.
    const antigo = path.join(raiz, "components", "admin", "admin-sidebar.old.tsx");
    expect(fs.existsSync(antigo)).toBe(true);
    expect(vivos.some((f) => f.includes("admin-sidebar.old"))).toBe(false);
  });
});
