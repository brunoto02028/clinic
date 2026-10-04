/**
 * @jest-environment node
 *
 * O anel de meta: o arco que se vê, e o alvo que não se inventa (118 T-10).
 *
 * ## Porque o anel é aritmética
 *
 * O app não tem biblioteca de desenho, e acrescentar uma mudaria o
 * *fingerprint* nativo — o update deixaria de chegar ao telemóvel que o Bruno
 * já tem. Então o anel é feito de duas metades recortadas e rodadas.
 *
 * ## Porque há um teste para o **desenho** e não só para os ângulos
 *
 * A primeira versão tinha cinco testes dos ângulos, todos verdes, e desenhava
 * um quarto de volta onde queria meia: o JSX pintava **um** lado da borda por
 * metade, e num círculo cada lado só pinta 90°. A 100 % saíam dois arquinhos
 * opostos — uns parênteses rodados, que se leem como metade. Entre 37,5 % e
 * 50 % o arco descolava do topo e deslizava para baixo.
 *
 * Nenhum dos cinco testes podia ver isso, porque o que estava errado não eram
 * os ângulos. O `arcoVisivel` mede **graus de anel que sobrevivem ao
 * recorte** — é a régua que faltava.
 *
 * ## A regra que importa mais do que o desenho
 *
 * **Sem meta não há anel.** As metas são do paciente (118 T-7), e um arco
 * contra um alvo que ninguém escolheu é a faixa de referência a voltar pela
 * porta dos fundos — a mesma que saiu da tela do paciente na 099 T-2.
 */

import {
  anguloDoAnel,
  arcoVisivel,
  estadoDoAnel,
  ladosPintados,
  percentagemDoAnel,
  rotacaoDaMetade,
  OFFSET_DA_BORDA,
} from "../../mobile/src/lib/anel-calculo";

describe("sem meta não há anel", () => {
  it("**meta nula devolve nada**", () => {
    expect(anguloDoAnel(5000, null)).toBeNull();
    expect(anguloDoAnel(5000, undefined)).toBeNull();
  });

  it("**meta zero ou negativa também**", () => {
    /*
     * Zero não é "sem meta" por acaso: é um alvo impossível, e dividir por ele
     * dá infinito. As duas coisas acabam no mesmo sítio — não se desenha.
     */
    expect(anguloDoAnel(5000, 0)).toBeNull();
    expect(anguloDoAnel(5000, -100)).toBeNull();
  });

  it("**e sem valor medido também não** — um anel vazio afirmaria zero passos", () => {
    expect(anguloDoAnel(null, 8000)).toBeNull();
    expect(anguloDoAnel(undefined, 8000)).toBeNull();
    expect(anguloDoAnel(Number.NaN, 8000)).toBeNull();
  });
});

describe("o arco que se vê é o arco que se quer", () => {
  const arco = (v: number, m: number) => Number(arcoVisivel(anguloDoAnel(v, m)!).toFixed(4));

  /*
   * Cada linha é um ponto onde a versão errada falhava: a 10 % não aparecia
   * nada, a 50 % e a 60 % desenhava-se o mesmo arco, e a 100 % faltavam 180°.
   */
  it.each([
    [0, 0],
    [800, 36],
    [2000, 90],
    [3000, 135],
    [4000, 180],
    [4800, 216],
    [6000, 270],
    [7200, 324],
    [8000, 360],
  ])("**%i passos numa meta de 8.000 desenham %i graus**", (valor, graus) => {
    expect(arco(valor, 8000)).toBeCloseTo(graus, 4);
  });

  it("**acima da meta fecha a volta e para** — não dá a segunda", () => {
    expect(arco(12000, 8000)).toBeCloseTo(360, 4);
  });

  it("**e o arco cresce sempre** — nunca anda para trás nem salta", () => {
    let anterior = -1;
    for (let p = 0; p <= 100; p++) {
      const g = arcoVisivel(anguloDoAnel(p, 100)!);
      expect(g).toBeGreaterThanOrEqual(anterior);
      /* A régua: graus são sempre a fracção vezes a volta. */
      expect(g).toBeCloseTo((p / 100) * 360, 4);
      anterior = g;
    }
  });
});

describe("cada metade pinta dois lados adjacentes, e não um", () => {
  it("**dois**, porque num círculo um lado da borda só pinta 90°", () => {
    expect(ladosPintados("direita")).toEqual(["top", "right"]);
    expect(ladosPintados("esquerda")).toEqual(["bottom", "left"]);
  });

  it("**e a rotação leva o offset que alinha o começo com as 12 horas**", () => {
    const a = anguloDoAnel(4000, 8000)!;
    expect(rotacaoDaMetade(a, "direita")).toBe(a.direita + OFFSET_DA_BORDA);
    expect(rotacaoDaMetade(a, "esquerda")).toBe(a.esquerda + OFFSET_DA_BORDA);
    expect(OFFSET_DA_BORDA).toBe(45);
  });
});

describe("as duas metades formam a volta", () => {
  const graus = (v: number, m: number) => {
    const a = anguloDoAnel(v, m)!;
    return { dir: a.direita, esq: a.esquerda, pct: percentagemDoAnel(a) };
  };

  it("**vazio: as duas metades escondidas**", () => {
    expect(graus(0, 8000)).toEqual({ dir: -180, esq: -180, pct: 0 });
  });

  it("**um quarto: a direita a meio, a esquerda ainda escondida**", () => {
    expect(graus(2000, 8000)).toEqual({ dir: -90, esq: -180, pct: 25 });
  });

  it("**metade: a direita cheia, a esquerda por começar**", () => {
    expect(graus(4000, 8000)).toEqual({ dir: 0, esq: -180, pct: 50 });
  });

  it("**três quartos: a direita fica, a esquerda a meio**", () => {
    /* A direita não anda mais depois dos 50 % — se andasse, dava a volta duas vezes. */
    expect(graus(6000, 8000)).toEqual({ dir: 0, esq: -90, pct: 75 });
  });

  it("**cheio: as duas fechadas**", () => {
    expect(graus(8000, 8000)).toEqual({ dir: 0, esq: 0, pct: 100 });
  });
});

describe("o desenho corta na meta, o número não", () => {
  it("**o anel fecha e fica fechado**", () => {
    const a = anguloDoAnel(12000, 8000)!;
    expect(a.direita).toBe(0);
    expect(a.esquerda).toBe(0);
    expect(a.progresso).toBe(1);
  });

  it("**mas diz a fracção inteira, como a barra doze linhas abaixo**", () => {
    /*
     * O anel escrevia 100 % e a `BarraDeMeta` escrevia "150 % da sua meta", na
     * mesma tela, para o mesmo facto. Quem corta é o desenho — a largura de um
     * arco não passa da volta — e isso é física, não é informação.
     */
    expect(percentagemDoAnel(anguloDoAnel(12000, 8000)!)).toBe(150);
    expect(percentagemDoAnel(anguloDoAnel(16000, 8000)!)).toBe(200);
    expect(percentagemDoAnel(anguloDoAnel(8000, 8000)!)).toBe(100);
    expect(percentagemDoAnel(anguloDoAnel(4000, 8000)!)).toBe(50);
  });

  it("**e a tela sabe que foi cumprida**", () => {
    expect(anguloDoAnel(12000, 8000)!.completo).toBe(true);
    expect(anguloDoAnel(8000, 8000)!.completo).toBe(true);
    expect(anguloDoAnel(7999, 8000)!.completo).toBe(false);
  });

  it("um valor negativo não puxa o anel para trás", () => {
    const a = anguloDoAnel(-50, 8000)!;
    expect(a.direita).toBe(-180);
    expect(arcoVisivel(a)).toBe(0);
    expect(percentagemDoAnel(a)).toBe(0);
  });
});

describe("a fila diz hoje, e tem de ser hoje", () => {
  /**
   * O valor do resumo é o **último medido**. Um relógio que sincronizou por
   * último no sábado dá 14.200 passos a uma terça parada — e o anel desenhava
   * a volta inteira debaixo de um cabeçalho que diz "METAS DE HOJE", em cima
   * do ladrilho que diz "Leitura de outro dia". Achado do review de 02/10/2026
   * na barra; o anel nasceu sem o `dia` e repetiu-o.
   */
  it("**leitura de outro dia não desenha progresso nenhum**", () => {
    expect(estadoDoAnel(14200, 8000, "2026-10-03", "2026-10-06")).toEqual({ tipo: "outro-dia" });
  });

  it("**leitura de hoje desenha**", () => {
    const e = estadoDoAnel(14200, 8000, "2026-10-06", "2026-10-06");
    expect(e.tipo).toBe("progresso");
    expect(e.tipo === "progresso" && percentagemDoAnel(e.angulo)).toBe(178);
  });

  it("**sem dia, desenha** — é o caso de quem não afirma nada sobre hoje", () => {
    expect(estadoDoAnel(4000, 8000, undefined, "2026-10-06").tipo).toBe("progresso");
    expect(estadoDoAnel(4000, 8000, null, "2026-10-06").tipo).toBe("progresso");
  });

  it("**e sem meta é sem meta, mesmo que o dia seja hoje**", () => {
    /*
     * A ordem importa: "sem meta" primeiro. Ao contrário, uma leitura velha de
     * quem nunca definiu meta diria "leitura de outro dia" — uma explicação
     * errada para uma ausência que é dela, não nossa.
     */
    expect(estadoDoAnel(4000, null, "2026-10-06", "2026-10-06")).toEqual({ tipo: "sem-meta" });
    expect(estadoDoAnel(4000, null, "2026-10-03", "2026-10-06")).toEqual({ tipo: "sem-meta" });
  });
});
