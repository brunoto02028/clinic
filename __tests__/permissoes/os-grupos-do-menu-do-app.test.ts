/**
 * @jest-environment node
 *
 * Os grupos do menu do paciente (112 T-1).
 *
 * O Bruno: *"vamos dividir em grupos como está na área da clinic, fica mais
 * fácil do paciente se localizar."* Hoje o menu é uma **lista única** de vinte
 * linhas em ordem alfabética, e ele tem razão no motivo: alfabético puro põe
 * *Articles* em primeiro e *Treatment plan* em décimo nono.
 *
 * Os grupos são os mesmos da clínica. Os **nomes** não podem ser: `Core (Always
 * Visible)` é conceito de quem administra, e `Clinical` é como a clínica fala de
 * si — não como alguém fala do que está a viver.
 */

import * as fs from "fs";
import * as path from "path";
import {
  MODULE_REGISTRY,
  MODULE_CATEGORIES,
  GRUPOS_NO_APP,
  GRUPO_NO_APP_POR_MODULO,
  grupoNoApp,
} from "@/lib/module-registry";
// Relativo de proposito: o SWC reescreve o `@/` do mobile antes de o
// `moduleNameMapper` do jest ter a chance de mandar para `mobile/src`.
import { agruparSecoes, type GrupoLido } from "../../mobile/src/lib/agrupar-secoes";

const RAIZ = path.join(__dirname, "..", "..");
const MENU = path.join(RAIZ, "mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");

/**
 * O menu da clinica **como esta escrito no arquivo**, linha por linha.
 *
 * Lido do arquivo, e nao copiado para ca, porque uma lista a mao tem exatamente
 * o defeito que este teste existe para impedir: a linha nova que ninguem
 * lembrou de agrupar nao apareceria aqui, e o teste aprovaria.
 */
function menuDaClinica(): Array<{ href: string; module?: string; grupo?: string }> {
  const fonte = fs.readFileSync(MENU, "utf8");
  const linhas: Array<{ href: string; module?: string; grupo?: string }> = [];
  for (const linha of fonte.split("\n")) {
    const h = linha.match(/href:\s*"([^"]+)"/);
    if (!h) continue;
    const m = linha.match(/module:\s*"([a-z_]+)"/);
    const g = linha.match(/grupo:\s*"([a-z]+)"/);
    linhas.push({ href: h[1], module: m?.[1], grupo: g?.[1] });
  }
  return linhas;
}

/** Os grupos como a rota os monta — a mesma conta, para nao testar outra coisa. */
function gruposDoServidor(): GrupoLido[] {
  return GRUPOS_NO_APP.map((g) => ({
    key: g.key,
    en: g.en,
    pt: g.pt,
    modulos: MODULE_REGISTRY.filter((m) => grupoNoApp(m.key) === g.key).map((m) => m.key),
  }));
}

/** As chaves que o menu do app consulta hoje. */
function modulosDoMenu(): string[] {
  const fonte = fs.readFileSync(MENU, "utf8");
  const chaves: string[] = [];
  for (const linha of fonte.split("\n")) {
    if (!linha.includes("href:")) continue;
    const m = linha.match(/module:\s*"([a-z_]+)"/);
    if (m) chaves.push(m[1]);
  }
  return chaves;
}

describe("todo item do menu tem casa", () => {
  it("**nenhum módulo do menu fica sem grupo**", () => {
    // É o que impede um item de sumir da tela ao agrupar: sem grupo, ele não é
    // desenhado em lugar nenhum — e some sem erro, que é a pior forma de sumir.
    const semGrupo = modulosDoMenu().filter((k) => !grupoNoApp(k));
    expect(semGrupo).toEqual([]);
  });

  it("a leitura do menu acha itens — senão o teste acima aprova o vazio", () => {
    expect(modulosDoMenu().length).toBeGreaterThan(5);
  });

  it("todo grupo declarado tem pelo menos um módulo", () => {
    // Cabeçalho sozinho é pior que grupo nenhum.
    for (const g of GRUPOS_NO_APP) {
      if (g.key === "account") continue; // o da conta vive das linhas sem módulo
      const n = MODULE_REGISTRY.filter((m) => grupoNoApp(m.key) === g.key).length;
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe("a tradução da taxonomia", () => {
  it("**nenhum nome de grupo do app é de administrador**", () => {
    // "Core (Always Visible)" fala do interruptor, não do tratamento.
    const proibidas = ["core", "always visible", "base", "sempre visível", "module", "módulo"];
    for (const g of GRUPOS_NO_APP) {
      for (const texto of [g.en, g.pt]) {
        for (const p of proibidas) {
          expect(texto.toLowerCase()).not.toContain(p);
        }
      }
    }
  });

  it("os grupos do app falam na segunda pessoa, e os da clínica não precisam", () => {
    // O controle de que são taxonomias diferentes de propósito, e não uma cópia
    // mal feita: se alguém igualar as duas, isto cai.
    const doApp = GRUPOS_NO_APP.map((g) => g.en).join(" ").toLowerCase();
    expect(doApp).toContain("your");
    const daClinica = MODULE_CATEGORIES.map((c) => c.label).join(" ").toLowerCase();
    expect(daClinica).not.toContain("your");
  });

  it("**os quatro recolocados estão justificados**", () => {
    // Recolocar é a exceção, e cada uma precisa de um porquê vivo. Uma lista que
    // cresce sem motivo vira uma segunda taxonomia por acidente.
    expect(Object.keys(GRUPO_NO_APP_POR_MODULO).sort()).toEqual(
      ["mod_guide", "mod_journey", "mod_plans", "mod_screening"].sort()
    );
  });

  it("o recolocado sai do grupo da clínica, e é esse o ponto", () => {
    for (const [chave, grupo] of Object.entries(GRUPO_NO_APP_POR_MODULO)) {
      const m = MODULE_REGISTRY.find((x) => x.key === chave);
      expect(m).toBeTruthy();
      expect(m!.category).not.toBe(grupo);
    }
  });

  it("**o check-in diário não cai em *Aprender***", () => {
    // `mod_journey` é material no painel e acende o check-in diário no app.
    // Sem o recolocar, a linha que a pessoa usa todo dia ficava debaixo de um
    // cabeçalho de leitura — e foi isto que me fez listar o que cada grupo
    // mostraria antes de desenhar a tela.
    expect(grupoNoApp("mod_journey")).toBe("wellness");
  });

  it("as duas línguas existem em todo grupo", () => {
    for (const g of GRUPOS_NO_APP) {
      expect(g.en.trim()).toBeTruthy();
      expect(g.pt.trim()).toBeTruthy();
      expect(g.en).not.toBe(g.pt);
    }
  });
});

describe("o que fica de fora, fica de fora de propósito", () => {
  it("**abas e áreas não viram linha de menu**", () => {
    // Home, Consultas, Exercícios e o perfil são abas; as áreas são o *Switch
    // area*. Se ganhassem grupo, apareceriam duas vezes.
    for (const k of ["mod_dashboard", "mod_appointments", "mod_exercises", "mod_profile", "mod_lab", "mod_clinica"]) {
      expect(grupoNoApp(k)).toBeNull();
    }
  });

  it("módulo que não existe não inventa grupo", () => {
    expect(grupoNoApp("mod_que_nao_existe")).toBeNull();
  });

  it("**a rota manda os grupos junto com os módulos**", () => {
    // Num segundo pedido, o menu ficaria sem grupos justamente quando a rede
    // está ruim — e aí a tela fica pior do que antes de agrupar.
    const rota = fs.readFileSync(
      path.join(RAIZ, "app", "api", "patient", "access", "route.ts"),
      "utf8"
    );
    const codigo = rota.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(codigo).toContain("grupos:");
    expect(codigo).toContain("modules: access.modules");
  });
});

describe("o menu real, distribuido pelos blocos", () => {
  it("**nenhuma das linhas da clinica sobra**", () => {
    // O bloco de sobra existe para nao perder linha, e nao para ser o normal. Se
    // uma linha nova nascer sem grupo, ela cai aqui — e este teste a aponta pelo
    // `href`, que e o que diz qual e.
    const blocos = agruparSecoes(menuDaClinica(), gruposDoServidor());
    const resto = blocos.find((b) => b.chave === "resto");
    expect(resto?.itens.map((s) => s.href) ?? []).toEqual([]);
  });

  it("**toda linha aparece, e aparece uma vez so**", () => {
    // A conta que importa de verdade: agrupar nao pode perder nem duplicar.
    const menu = menuDaClinica();
    const blocos = agruparSecoes(menu, gruposDoServidor());
    const saida = blocos.flatMap((b) => b.itens.map((s) => s.href));
    expect(saida.slice().sort()).toEqual(menu.map((s) => s.href).sort());
    expect(new Set(saida).size).toBe(saida.length);
  });

  it("os quatro grupos aparecem — senao agrupar nao mudou nada", () => {
    const blocos = agruparSecoes(menuDaClinica(), gruposDoServidor());
    expect(blocos.map((b) => b.chave)).toEqual(["clinical", "wellness", "content", "account"]);
  });

  it("**a pressao arterial e o check-in ficam no dia a dia**, e nao na conta", () => {
    // As duas medidas diarias. A pressao nao tem modulo e declara o grupo no
    // arquivo; o check-in tem, e o servidor o recoloca. Caminhos diferentes,
    // mesmo destino — e e o destino que a pessoa ve.
    const blocos = agruparSecoes(menuDaClinica(), gruposDoServidor());
    const diaADia = blocos.find((b) => b.chave === "wellness")!.itens.map((s) => s.href);
    expect(diaADia).toContain("/(app)/(clinica)/blood-pressure");
    expect(diaADia).toContain("/(app)/(clinica)/daily-checkin");
  });

  it("a ordem de entrada e preservada dentro do bloco", () => {
    // Quem chama ja ordenou alfabeticamente. Reordenar aqui seria decidir a
    // mesma coisa duas vezes, e uma delas ficaria errada.
    const grupos: GrupoLido[] = [{ key: "clinical", en: "Your care", pt: "Seu tratamento", modulos: ["a", "b"] }];
    const blocos = agruparSecoes(
      [{ href: "/2", module: "b" }, { href: "/1", module: "a" }],
      grupos
    );
    expect(blocos[0].itens.map((s) => s.href)).toEqual(["/2", "/1"]);
  });
});

describe("quando nao ha grupo, a tela volta a ser a de antes", () => {
  it("**servidor sem grupos: um bloco sem cabecalho, com tudo dentro**", () => {
    // Um app atualizado falando com um servidor antigo. A lista unica e pior de
    // ler; uma linha a menos seria um defeito.
    const menu = menuDaClinica();
    const blocos = agruparSecoes(menu, []);
    expect(blocos).toHaveLength(1);
    expect(blocos[0].grupo).toBeNull();
    expect(blocos[0].itens).toHaveLength(menu.length);
  });

  it("**o laboratorio passa pelo mesmo componente e nao perde nada**", () => {
    // Quatro linhas sem modulo e sem grupo: elas nao tem onde cair, e e por isso
    // que o bloco de sobra existe.
    const lab = [{ href: "/a" }, { href: "/b" }, { href: "/c" }, { href: "/d" }];
    const blocos = agruparSecoes(lab, gruposDoServidor());
    expect(blocos).toHaveLength(1);
    expect(blocos[0].grupo).toBeNull();
    expect(blocos[0].itens).toHaveLength(4);
  });

  it("**grupo escrito errado nao some da tela**", () => {
    // `grupo: "conta"` em vez de `"account"`. A linha continua visivel, no fim,
    // sem cabecalho — e o teste de grafia mais abaixo e quem aponta o erro.
    const blocos = agruparSecoes([{ href: "/x", grupo: "conta" }], gruposDoServidor());
    expect(blocos.flatMap((b) => b.itens.map((s) => s.href))).toEqual(["/x"]);
  });

  it("grupo sem nenhuma linha nao vira cabecalho sozinho", () => {
    const blocos = agruparSecoes([{ href: "/x", grupo: "account" }], gruposDoServidor());
    expect(blocos.map((b) => b.chave)).toEqual(["account"]);
  });

  it("menu vazio nao inventa bloco", () => {
    expect(agruparSecoes([], gruposDoServidor())).toEqual([]);
  });
});

describe("a grafia do grupo declarado a mao", () => {
  it("**todo `grupo:` do app e uma chave que existe**", () => {
    // Sem isto, um `grupo: "conta"` manda a linha para o fim da tela em silencio.
    const chaves = new Set<string>(GRUPOS_NO_APP.map((g) => g.key));
    const errados: string[] = [];
    const anda = (dir: string) => {
      for (const nome of fs.readdirSync(dir)) {
        if (["node_modules", ".expo", "dist"].includes(nome)) continue;
        const p = path.join(dir, nome);
        if (fs.statSync(p).isDirectory()) { anda(p); continue; }
        if (!/\.tsx?$/.test(nome)) continue;
        const fonte = fs.readFileSync(p, "utf8");
        for (const m of fonte.matchAll(/grupo:\s*"([a-z_]+)"/g)) {
          if (!chaves.has(m[1])) errados.push(`${nome}: ${m[1]}`);
        }
      }
    };
    anda(path.join(RAIZ, "mobile", "app"));
    expect(errados).toEqual([]);
  });

  it("**toda linha sem modulo declara grupo**", () => {
    // Nao tem de onde herdar: sem `grupo`, cai no bloco de sobra e a tela fica
    // meio arrumada — que e o defeito que ninguem nota.
    const soltas = menuDaClinica().filter((s) => !s.module && !s.grupo);
    expect(soltas.map((s) => s.href)).toEqual([]);
  });

  it("existem linhas sem modulo — senao o teste acima aprova o vazio", () => {
    expect(menuDaClinica().filter((s) => !s.module).length).toBeGreaterThan(3);
  });
});
