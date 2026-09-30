/**
 * @jest-environment node
 *
 * A mesma ordem no painel da clínica e no menu do app.
 *
 * O Bruno, 30/09/2026: *"quero ordem no app também… na clinic e no app precisa
 * refletir a mesma ordem."*
 *
 * São **duas** implementações, e a duplicação não dá para evitar: o `@/` do
 * mobile aponta para `mobile/src`, o da web para a raiz, e nenhum alcança o
 * outro. O que este arquivo faz é o que torna a duplicação segura — alimenta as
 * duas com a mesma lista e exige a mesma resposta.
 *
 * O import do mobile é **relativo de propósito**: o SWC reescreve o `@/` antes
 * do `moduleNameMapper` do jest, e um `@/lib/...` aqui resolveria para a raiz da
 * web em vez do `mobile/src`.
 */

import { ordenarPorNome } from "@/lib/ordenar-modulos";
import { ordenarSecoes } from "../../mobile/src/lib/ordenar-secoes";

/** As duas formas do mesmo item: como o painel guarda e como o app guarda. */
const par = (en: string, pt: string) => ({
  painel: { label: en, labelPt: pt },
  app: { title: { en, pt } },
});

/** Os vinte nomes reais do menu do app, com os do painel onde diferem. */
const NOMES: Array<[string, string]> = [
  ["Messages", "Mensagens"],
  ["My records", "Meu prontuário"],
  ["My documents", "Meus documentos"],
  ["Invoices", "Faturas"],
  ["People I look after", "Quem eu cuido"],
  ["Treatment plan", "Plano de tratamento"],
  ["Plans", "Planos"],
  ["Pending actions", "Pendências"],
  ["Assessment screening", "Avaliação"],
  ["My progress", "Meu progresso"],
  ["Outcome measures", "Medidas de evolução"],
  ["My reports", "Meus relatórios"],
  ["Daily check-in", "Check-in diário"],
  ["Blood pressure", "Pressão arterial"],
  ["Articles", "Artigos"],
  ["Devices", "Dispositivos"],
  ["How it works", "Como funciona"],
  ["Terms & consent", "Termos & consentimento"],
  ["Who has access", "Quem tem acesso"],
  ["Notifications", "Notificações"],
];

const rotulo = (pt: boolean) => (en: string, ptLabel: string) => (pt ? ptLabel : en);

/** A ordem que cada lado produz, em nomes, para a lista e a língua dadas. */
function ordens(nomes: Array<[string, string]>, pt: boolean) {
  const pares = nomes.map(([en, p]) => par(en, p));
  const doPainel = ordenarPorNome(
    pares.map((x) => x.painel),
    rotulo(pt),
    pt
  ).map((x) => (pt ? x.labelPt : x.label));
  const doApp = ordenarSecoes(
    pares.map((x) => x.app),
    pt ? "pt-BR" : "en-GB"
  ).map((x) => (pt ? x.title.pt : x.title.en));
  return { doPainel, doApp };
}

describe("os dois lados concordam", () => {
  it("**a lista real do menu, em inglês**", () => {
    const { doPainel, doApp } = ordens(NOMES, false);
    expect(doApp).toEqual(doPainel);
  });

  it("**a lista real do menu, em português**", () => {
    const { doPainel, doApp } = ordens(NOMES, true);
    expect(doApp).toEqual(doPainel);
  });

  it("e as duas ordens são **diferentes entre si** — senão o teste acima é vazio", () => {
    // Se inglês e português dessem a mesma ordem, os dois testes acima passariam
    // com uma implementação que ignora a língua. Estes nomes garantem que não.
    const ingles = ordens(NOMES, false).doApp;
    const portugues = ordens(NOMES, true).doApp;
    expect(ingles[0]).toBe("Articles");
    expect(portugues[0]).toBe("Artigos");
    // "Blood pressure" é o 2º em inglês; "Pressão arterial" cai para o fim.
    expect(ingles.indexOf("Blood pressure")).toBeLessThan(3);
    expect(portugues.indexOf("Pressão arterial")).toBeGreaterThan(12);
  });

  it("concordam também no que costuma separar implementações", () => {
    const dificeis: Array<[string, string]> = [
      ["zebra", "zebra"],
      ["Ápice", "Ápice"],
      ["apple", "apple"],
      ["Ärger", "Ärger"],
      ["banana", "banana"],
      ["Çedilha", "Çedilha"],
    ];
    for (const pt of [false, true]) {
      const { doPainel, doApp } = ordens(dificeis, pt);
      expect(doApp).toEqual(doPainel);
    }
  });
});

describe("a ordem do app, por si", () => {
  const nomesApp = (pt: boolean) =>
    ordenarSecoes(
      NOMES.map(([en, p]) => ({ title: { en, pt: p } })),
      pt ? "pt-BR" : "en-GB"
    ).map((x) => (pt ? x.title.pt : x.title.en));

  it("**acento não vai para o fim** — o que `sort()` cru faria", () => {
    const saida = nomesApp(true);
    // "Avaliação" fica entre "Artigos" e "Check-in diário", e não depois de "Quem eu cuido".
    expect(saida.indexOf("Avaliação")).toBeLessThan(saida.indexOf("Check-in diário"));
    expect(saida.indexOf("Avaliação")).toBeGreaterThan(saida.indexOf("Artigos"));
  });

  it("a língua é lida com tolerância — `pt`, `pt-BR`, `PT-br`", () => {
    const esperado = nomesApp(true);
    for (const lang of ["pt", "pt-BR", "PT-br", "pt_br"]) {
      const saida = ordenarSecoes(
        NOMES.map(([en, p]) => ({ title: { en, pt: p } })),
        lang
      ).map((x) => x.title.pt);
      expect(saida).toEqual(esperado);
    }
  });

  it("língua desconhecida ou vazia cai no inglês, e não estoura", () => {
    for (const lang of ["", "de", "xx"]) {
      const saida = ordenarSecoes(
        NOMES.map(([en, p]) => ({ title: { en, pt: p } })),
        lang
      );
      expect(saida).toHaveLength(NOMES.length);
      expect(saida[0].title.en).toBe("Articles");
    }
  });

  it("**não altera a lista de origem** — ela é o módulo, importado noutros lugares", () => {
    const original = NOMES.map(([en, p]) => ({ title: { en, pt: p } }));
    const antes = original.map((x) => x.title.en);
    ordenarSecoes(original, "en-GB");
    expect(original.map((x) => x.title.en)).toEqual(antes);
  });

  it("nenhuma entrada se perde", () => {
    expect(nomesApp(false)).toHaveLength(NOMES.length);
    expect(nomesApp(true)).toHaveLength(NOMES.length);
  });
});
