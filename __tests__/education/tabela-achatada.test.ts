/**
 * @jest-environment node
 *
 * A tabela que virou parágrafo (107 T-5).
 *
 * Apareceu enquanto eu media outra coisa — o TODO da T-3. O paciente lia, num
 * parágrafo corrido, conteúdo clínico assim:
 *
 *     | Teste | O que um resultado positivo indica | |---|---| | Regra
 *     canadense para coluna cervical | descarta ou sinaliza necessidade de
 *     exame de imagem (fratura) | …
 *
 * O conversor de markdown desta casa trata título, citação e lista, e não trata
 * tabela: ela caía inteira no caminho do parágrafo.
 */
import { tabelaAchatada, emBlocos, emTextoSimples } from "@/lib/rich-text-blocks";

const REAL =
  "| Teste | O que um resultado positivo indica | |---|---| " +
  "| Regra canadense para coluna cervical | descarta ou sinaliza necessidade de exame de imagem (fratura) | " +
  "| Triagem de insuficiência vertebrobasilar (IVB) | avalia risco vascular ANTES de qualquer mobilização |";

describe("reconhecer a tabela", () => {
  it("**a tabela real do protocolo é reconhecida**", () => {
    const t = tabelaAchatada(REAL)!;
    expect(t.cabecalho).toEqual(["Teste", "O que um resultado positivo indica"]);
    expect(t.linhas).toHaveLength(2);
    expect(t.linhas[0][0]).toBe("Regra canadense para coluna cervical");
    expect(t.linhas[1][1]).toMatch(/risco vascular/);
  });

  it("**um parágrafo comum não vira tabela**", () => {
    expect(tabelaAchatada("Isto é um parágrafo normal, sem tabela nenhuma.")).toBeNull();
  });

  it("uma frase com um pipe solto também não", () => {
    // O que denuncia a tabela não são os pipes — é a linha de traços.
    expect(tabelaAchatada("use o operador | para encadear comandos")).toBeNull();
  });

  it("sem a linha de traços não há como saber onde o cabeçalho acaba", () => {
    expect(tabelaAchatada("| a | b | | c | d |")).toBeNull();
  });

  it("cabeçalho de uma coluna só não é tabela", () => {
    expect(tabelaAchatada("| Teste | |---| | a |")).toBeNull();
  });

  it("separador sem nenhuma linha de dados não vira tabela vazia", () => {
    expect(tabelaAchatada("| a | b | |---|---|")).toBeNull();
  });

  it("sobra que não completa a linha ainda aparece", () => {
    // Some numa célula em branco, e não some de vez: é conteúdo clínico.
    const t = tabelaAchatada("| a | b | |---|---| | 1 | 2 | | 3 |")!;
    expect(t.linhas).toEqual([["1", "2"], ["3", ""]]);
  });

  it("três colunas também", () => {
    const t = tabelaAchatada("| a | b | c | |---|---|---| | 1 | 2 | 3 |")!;
    expect(t.cabecalho).toHaveLength(3);
    expect(t.linhas).toEqual([["1", "2", "3"]]);
  });

  it("alinhamento do markdown (`:---:`) não atrapalha", () => {
    expect(tabelaAchatada("| a | b | |:---|---:| | 1 | 2 |")).not.toBeNull();
  });
});

describe("o bloco chega ao aplicativo", () => {
  it("**o parágrafo de pipes vira um bloco de tabela**", () => {
    const blocos = emBlocos(`<p>${REAL}</p>`);
    expect(blocos).toHaveLength(1);
    expect(blocos[0].tipo).toBe("tabela");
  });

  it("e o `&nbsp;` da tradução não impede o reconhecimento", () => {
    // O conteúdo em português veio com espaço teimoso entre todas as palavras.
    const comNbsp = `<p>${REAL.replace(/ /g, "&nbsp;")}</p>`;
    expect(emBlocos(comNbsp)[0].tipo).toBe("tabela");
  });

  it("um parágrafo de verdade continua parágrafo", () => {
    expect(emBlocos("<p>Movimento e carga progressiva.</p>")[0].tipo).toBe("paragrafo");
  });

  it("o texto simples não perde o conteúdo da tabela", () => {
    // É o que alimenta resumo e busca: se a tabela sumisse daqui, o artigo
    // ficaria sem metade do que diz.
    const simples = emTextoSimples(`<p>${REAL}</p>`);
    expect(simples).toMatch(/Regra canadense/);
    expect(simples).toMatch(/risco vascular/);
    expect(simples).not.toMatch(/\|---/);
  });
});
