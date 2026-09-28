/**
 * @jest-environment node
 *
 * O catálogo cabe na tela (26/09/2026, à noite).
 *
 * Duas correções no mesmo lugar, e a segunda desfaz o excesso da primeira —
 * vale registrar porque o excesso foi meu.
 *
 * De manhã: a fileira de categorias rolava para o lado e a última ficava
 * fatiada na borda, "Alle..." em vez de "Allergy", sem nada indicando que dava
 * para arrastar. Troquei por quebra de linha.
 *
 * Duas horas depois, o Bruno: *"fica congelado, aquelas palavras lá em cima, e
 * fica pouca opção de visualização das rolagens dos exames embaixo."* Com
 * **doze** categorias, a quebra virou quatro fileiras; somadas ao título, ao
 * subtítulo e à busca — todos fixos —, sobrava um exame e meio visível num
 * catálogo de vinte e dois.
 *
 * Nada escondido na borda **e** nada engolindo a lista.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..", "mobile");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const tela = ler("app", "(app)", "(lab)", "(tabs)", "index.tsx");

describe("o cabeçalho rola junto com a lista", () => {
  it("ele é o `ListHeaderComponent`, não um bloco fixo acima", () => {
    // Fixo, ele deixava uma janelinha para os exames.
    expect(tela).toMatch(/ListHeaderComponent=\{cabecalho\}/);
    expect(tela).toMatch(/const cabecalho = \(/);
  });

  it("mas aparece também quando não há lista", () => {
    // Carregando, erro e vazio não têm `FlatList` — e o cabeçalho é o que diz
    // onde a pessoa está.
    expect(tela).toMatch(
      /catalog\.isLoading \|\| catalog\.isError \|\| filtered\.length === 0 \? cabecalho : null/
    );
  });

  it("e o vão entre ele e o primeiro exame é explícito", () => {
    // O `gap` do `contentContainerStyle` não alcança o cabeçalho.
    expect(tela).toMatch(/ListHeaderComponentStyle=\{\{ marginBottom: 16 \}\}/);
  });
});

describe("as categorias não engolem mais a tela", () => {
  it("só as que cabem em duas fileiras aparecem", () => {
    expect(tela).toMatch(/const CATEGORIAS_VISIVEIS = 7;/);
    expect(tela).toMatch(/todasCategorias \? categories : categories\.slice\(0, CATEGORIAS_VISIVEIS\)/);
  });

  it("e o resto entra num toque, dizendo quantas são", () => {
    // `+5` diz o que está escondido; uma seta não diria.
    expect(tela).toMatch(/`\+\$\{categories\.length - CATEGORIAS_VISIVEIS\}`/);
    expect(tela).toMatch(/en: "Less", pt: "Menos"/);
  });

  it("o botão só existe quando há o que esconder", () => {
    expect(tela).toMatch(/categories\.length > CATEGORIAS_VISIVEIS && \(/);
  });

  it("continuam quebrando em linha — nada fatiado na borda", () => {
    // A correção da manhã segue de pé; o que mudou foi quantas aparecem.
    expect(tela).toMatch(/flexDirection: "row", flexWrap: "wrap", gap: 8/);
    expect(semComentarios(tela)).not.toMatch(/ScrollView\s+horizontal/);
  });
});
