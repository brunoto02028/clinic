/**
 * @jest-environment node
 *
 * A ordem alfabética das listas de permissão (110 T-5).
 *
 * O Bruno pediu ordem alfabética e escolheu manter os cinco grupos — a ordem
 * deles tem intenção, e alfabético puro misturaria *Marketplace* com
 * *My Records*. O que muda é achar um módulo pelo nome dentro do grupo.
 */

import { ordenarPorNome } from "@/lib/ordenar-modulos";
import { MODULE_REGISTRY, MODULE_CATEGORIES } from "@/lib/module-registry";

/** Como as telas resolvem o par EN/PT, sem o `relabel` da casa. */
const rotulo = (pt: boolean) => (en: string, ptLabel: string) => (pt ? ptLabel : en);

const nomes = (itens: Array<{ label: string; labelPt: string }>, pt: boolean) =>
  ordenarPorNome(itens, rotulo(pt), pt).map((i) => (pt ? i.labelPt : i.label));

const item = (label: string, labelPt = label) => ({ label, labelPt });

describe("ordena pelo rótulo da língua exibida", () => {
  it("**em português, ordem portuguesa** — e não a inglesa traduzida", () => {
    // O caso que separa as duas: em inglês *Achievements* vem antes de
    // *Devices*; em português *Conquistas* vem **depois** de *Dispositivos*.
    const lista = [item("Devices", "Dispositivos"), item("Achievements", "Conquistas")];
    expect(nomes(lista, false)).toEqual(["Achievements", "Devices"]);
    expect(nomes(lista, true)).toEqual(["Conquistas", "Dispositivos"]);
  });

  it("os dois sentidos da mesma lista dão ordens diferentes", () => {
    // Sem este controle, uma função que ignorasse a língua passaria no teste
    // acima sempre que as duas ordens coincidissem.
    const lista = [
      item("Quizzes", "Questionários"),
      item("Achievements", "Conquistas"),
      item("Marketplace", "Marketplace"),
    ];
    expect(nomes(lista, false)).toEqual(["Achievements", "Marketplace", "Quizzes"]);
    expect(nomes(lista, true)).toEqual(["Conquistas", "Marketplace", "Questionários"]);
  });
});

describe("o que `sort()` cru erraria", () => {
  it("**acento não vai para o fim da lista**", () => {
    // `["Avaliação","Devices"].sort()` põe "Avaliação" depois, porque compara
    // por código e o "ç" fica acima do "z".
    const lista = [item("Devices", "Devices"), item("Avaliação", "Avaliação")];
    expect(nomes(lista, true)).toEqual(["Avaliação", "Devices"]);
    expect(lista.map((i) => i.label).sort()).toEqual(["Avaliação", "Devices"]);
  });

  it("**maiúscula não vem antes de toda minúscula**", () => {
    const lista = [item("banana"), item("Abacaxi"), item("cereja"), item("Damasco")];
    expect(nomes(lista, false)).toEqual(["Abacaxi", "banana", "cereja", "Damasco"]);
    // O cru agruparia as maiúsculas primeiro:
    expect(lista.map((i) => i.label).sort()).toEqual(["Abacaxi", "Damasco", "banana", "cereja"]);
  });
});

describe("não mexe no que não é a ordem", () => {
  it("**não altera a lista de origem** — ela é usada noutros lugares", () => {
    const lista = [item("Zebra"), item("Abelha")];
    const antes = lista.map((i) => i.label);
    ordenarPorNome(lista, rotulo(false), false);
    expect(lista.map((i) => i.label)).toEqual(antes);
  });

  it("lista vazia e de um item não estouram", () => {
    expect(nomes([], false)).toEqual([]);
    expect(nomes([item("Só eu")], false)).toEqual(["Só eu"]);
  });

  it("nomes iguais não somem", () => {
    const lista = [item("Marketplace"), item("Marketplace")];
    expect(nomes(lista, false)).toHaveLength(2);
  });
});

describe("o catálogo de verdade, por grupo", () => {
  it("**cada grupo sai em ordem, nas duas línguas**", () => {
    // Não é um exemplo inventado: são os módulos que o painel mostra.
    for (const cat of MODULE_CATEGORIES) {
      const doGrupo = MODULE_REGISTRY.filter((m) => m.category === cat.key);
      if (doGrupo.length < 2) continue;
      for (const pt of [false, true]) {
        const saida = nomes(doGrupo, pt);
        const esperado = [...saida].sort((a, b) =>
          a.localeCompare(b, pt ? "pt-BR" : "en-GB", { sensitivity: "base" })
        );
        expect(saida).toEqual(esperado);
      }
    }
  });

  it("nenhum módulo se perde na ordenação", () => {
    for (const cat of MODULE_CATEGORIES) {
      const doGrupo = MODULE_REGISTRY.filter((m) => m.category === cat.key);
      expect(ordenarPorNome(doGrupo, rotulo(false), false)).toHaveLength(doGrupo.length);
    }
  });

  it("**os grupos mantêm a ordem de hoje** — ela tem intenção", () => {
    // Principal primeiro, e o resto depois. Ordenar os grupos também seria
    // alfabético demais: "Clinical" antes de "Core" põe o prontuário acima do
    // painel inicial.
    expect(MODULE_CATEGORIES.map((c) => c.key)).toEqual([
      "core",
      "clinical",
      "wellness",
      "content",
      "app_areas",
    ]);
  });
});
