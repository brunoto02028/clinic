/**
 * @jest-environment node
 *
 * Quem terminou de ler quer o próximo (107 T-2).
 *
 * O Bruno: *"ao final de cada artigo, dá pra colocar atalhos para outros, algo
 * assim?"*
 *
 * A decisão que estes testes protegem não é a de mostrar atalhos — é a de
 * **não fingir parentesco**. Categoria é uma relação que existe; semelhança de
 * conteúdo, com poucas dezenas de textos, seria chute. E num texto clínico um
 * chute não é só irrelevante: quem acabou de ler sobre dor lombar e recebe
 * túnel do carpo acha que o app concluiu algo sobre ele.
 */
import { continuarLendo, TEXTO_CONTINUAR } from "../../mobile/src/lib/continuar-lendo";
import { lerCodigo } from "../helpers/codigo";

jest.mock("../../mobile/src/api/client", () => ({ apiFetch: jest.fn() }));

const art = (id: string, categoria?: string) =>
  ({ id, title: id, description: null, contentType: "ARTICLE",
     category: categoria ? { id: categoria, name: categoria, color: null } : null }) as any;

describe("o que oferecer depois de ler", () => {
  it("**traz os da mesma categoria**", () => {
    const r = continuarLendo(
      [art("atual", "coluna"), art("a", "coluna"), art("b", "coluna"), art("c", "joelho")],
      "atual",
      "coluna"
    );
    expect(r.motivo).toBe("mesma-categoria");
    expect(r.itens.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("**nunca inclui o artigo que a pessoa está lendo**", () => {
    const r = continuarLendo([art("atual", "coluna"), art("a", "coluna")], "atual", "coluna");
    expect(r.itens.map((i) => i.id)).not.toContain("atual");
  });

  it("no máximo três", () => {
    const muitos = ["a", "b", "c", "d", "e"].map((i) => art(i, "coluna"));
    const r = continuarLendo([art("atual", "coluna"), ...muitos], "atual", "coluna");
    expect(r.itens).toHaveLength(3);
  });

  it("único na categoria: cai para os recentes, **e diz que são recentes**", () => {
    const r = continuarLendo([art("atual", "coluna"), art("a", "joelho")], "atual", "coluna");
    expect(r.motivo).toBe("recentes");
    expect(r.itens.map((i) => i.id)).toEqual(["a"]);
  });

  it("artigo sem categoria não vira parente de todo mundo", () => {
    const r = continuarLendo([art("atual"), art("a", "joelho")], "atual", null);
    expect(r.motivo).toBe("recentes");
  });

  it("**nada para oferecer devolve lista vazia** — a seção some", () => {
    // Seção vazia é pior que seção ausente: promete e não entrega.
    expect(continuarLendo([art("atual", "coluna")], "atual", "coluna").itens).toHaveLength(0);
    expect(continuarLendo([], "atual", "coluna").itens).toHaveLength(0);
    expect(continuarLendo(null, "atual", "coluna").itens).toHaveLength(0);
  });

  it("a ordem que o servidor mandou é respeitada", () => {
    // Reordenar aqui seria inventar um critério que ninguém mediu.
    const r = continuarLendo(
      [art("atual", "c"), art("terceiro", "c"), art("primeiro", "c")],
      "atual",
      "c"
    );
    expect(r.itens.map((i) => i.id)).toEqual(["terceiro", "primeiro"]);
  });

  it("item sem id não entra e não quebra", () => {
    const r = continuarLendo([art("atual", "c"), { id: "", title: "x" } as any, art("a", "c")], "atual", "c");
    expect(r.itens.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("o título diz qual relação está sendo mostrada", () => {
  it("o de categoria afirma o tema; o de recentes não afirma nada", () => {
    expect(TEXTO_CONTINUAR["mesma-categoria"].en).toMatch(/topic/i);
    expect(TEXTO_CONTINUAR.recentes.en).not.toMatch(/topic|related|similar/i);
  });

  it("as duas línguas existem em todos os textos", () => {
    for (const copy of Object.values(TEXTO_CONTINUAR)) {
      expect(copy.en.trim()).not.toBe("");
      expect(copy.pt.trim()).not.toBe("");
      expect(copy.pt).not.toBe(copy.en);
    }
  });

  it("nenhum texto promete semelhança de conteúdo", () => {
    for (const copy of Object.values(TEXTO_CONTINUAR)) {
      expect(`${copy.en} ${copy.pt}`).not.toMatch(/similar|related|recomend|semelhante|parecid/i);
    }
  });
});

describe("a tela usa a regra", () => {
  const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "education", "[id].tsx");

  it("a seção existe no fim do artigo", () => {
    expect(tela).toMatch(/continuar-lendo/);
  });

  it("há caminho de volta para a lista", () => {
    expect(tela).toMatch(/ver-todos-materiais/);
  });

  it("**o caminho de volta não depende de haver sugestões**", () => {
    /**
     * Achado do QA (29/09/2026): o botão estava dentro do bloco que desenha as
     * sugestões, **depois** do `return null`. O paciente da clínica com um
     * material só ficava sem saída nenhuma no fim do artigo — que é exatamente
     * o que esta tarefa foi corrigir.
     *
     * Medido pela ordem no arquivo: o botão vem **depois** do fecho do bloco
     * condicional, e não dentro dele.
     */
    const fechoDoCondicional = tela.indexOf(") : null}");
    const botaoDeVolta = tela.indexOf("ver-todos-materiais");
    expect(fechoDoCondicional).toBeGreaterThan(-1);
    expect(botaoDeVolta).toBeGreaterThan(fechoDoCondicional);
  });

  it("não faz chamada nova: os candidatos vêm da lista já carregada", () => {
    expect(tela).toContain("educationList(data)");
  });
});
