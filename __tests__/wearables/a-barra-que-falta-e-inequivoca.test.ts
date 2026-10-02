/**
 * @jest-environment node
 *
 * A tendência nos cartões da aba Saúde (118 T-9).
 *
 * ## O pedido
 *
 * > *"ainda vou ver aquela cara do Saúde com a cara do Sonarhealth?"* — Bruno
 *
 * O cartão dizia um número e, quando havia meta, o quanto dele estava feito. Não
 * dizia **o que mudou** — que é a pergunta que leva alguém a olhar para isto.
 *
 * ## Porque barras, e não a linha do relatório
 *
 * `react-native-svg` não está instalado, e acrescentá-lo é um módulo nativo
 * novo — o que muda o *fingerprint* e faz o `eas update` **deixar de chegar aos
 * binários já instalados**. Um desenho bonito que ninguém recebe não é um
 * desenho.
 *
 * E a restrição produz o visual mais honesto: **uma barra que falta é
 * inequívoca**. No papel foi preciso uma regra para a linha não atravessar um
 * dia sem dado; aqui isso é a forma.
 */

import {
  tendenciaEmBarras,
  MINIMO_DE_DIAS,
} from "../../mobile/src/lib/barras-da-metrica";

/** Dias seguidos a partir de 19/09/2026, com `null` onde não houve medição. */
const serie = (valores: Array<number | null>) =>
  valores.map((valor, i) => {
    const d = new Date(Date.UTC(2026, 8, 19));
    d.setUTCDate(d.getUTCDate() + i);
    return { dia: d.toISOString().slice(0, 10), valor };
  });

describe("o dia sem medição fica no lugar dele", () => {
  it("**uma barra por dia da janela**, e não por dia com dado", () => {
    /*
     * Tirar o dia sem medição encolheria tudo o que vem depois para a
     * esquerda — o mesmo erro que encurtou uma gravação de ECG de 30 s para
     * 29,003 s, e que aqui faria *"há três dias"* parecer *"ontem"*.
     */
    const t = tendenciaEmBarras(serie([50, null, null, 54, 56]), 5)!;
    expect(t.barras).toHaveLength(5);
    expect(t.barras.map((b) => b.altura === null)).toEqual([false, true, true, false, false]);
  });

  it("**o buraco não tem altura** — e por isso não se desenha", () => {
    const t = tendenciaEmBarras(serie([50, null, 54]), 3)!;
    expect(t.barras[1].altura).toBeNull();
    expect(t.barras[1].valor).toBeNull();
  });

  it("**e os dias são consecutivos**, mesmo os que faltam", () => {
    const t = tendenciaEmBarras(serie([50, null, 54]), 3)!;
    expect(t.barras.map((b) => b.dia)).toEqual(["2026-09-19", "2026-09-20", "2026-09-21"]);
  });

  it("**um dia que não aparece na série é um buraco**, não uma ausência", () => {
    /*
     * A série vem do banco só com os dias que têm linha. A janela é preenchida
     * a partir do dia mais recente para trás, e os que faltarem ficam vazios no
     * sítio certo.
     */
    const salteada = [
      { dia: "2026-09-19", valor: 50 },
      { dia: "2026-09-23", valor: 58 },
    ];
    const t = tendenciaEmBarras(salteada, 5)!;
    expect(t.barras).toHaveLength(5);
    expect(t.barras.map((b) => b.valor)).toEqual([50, null, null, null, 58]);
  });
});

describe("a janela", () => {
  it("**conta para trás a partir do dia mais recente com dado**", () => {
    const t = tendenciaEmBarras(serie([50, 52, 54]), 3)!;
    expect(t.barras[t.barras.length - 1].dia).toBe("2026-09-21");
  });

  it("**e corta o que é mais antigo do que ela** — catorze fios de um pixel não se lêem", () => {
    const t = tendenciaEmBarras(serie([10, 20, 30, 40, 50]), 3)!;
    expect(t.barras).toHaveLength(3);
    expect(t.barras.map((b) => b.valor)).toEqual([30, 40, 50]);
    /* E os limites são os da janela mostrada, não os da série inteira. */
    expect(t.minimo).toBe(30);
  });

  it("uma janela maior do que a série enche-se de buracos à esquerda", () => {
    const t = tendenciaEmBarras(serie([50, 52]), 5)!;
    expect(t.barras.map((b) => b.valor)).toEqual([null, null, null, 50, 52]);
  });
});

describe("quando não há tendência, não se desenha", () => {
  it("**um dia só não é tendência**", () => {
    // Uma barra sozinha ao lado de seis vazios sugere uma série que não existe.
    expect(MINIMO_DE_DIAS).toBe(2);
    expect(tendenciaEmBarras(serie([50]), 7)).toBeNull();
  });

  it("nenhum dado, nenhuma caixa", () => {
    expect(tendenciaEmBarras(serie([null, null, null]), 3)).toBeNull();
    expect(tendenciaEmBarras([], 7)).toBeNull();
    expect(tendenciaEmBarras(null, 7)).toBeNull();
    expect(tendenciaEmBarras(undefined, 7)).toBeNull();
  });

  it("e uma data ilegível não entra", () => {
    expect(tendenciaEmBarras([{ dia: "não é data", valor: 50 }], 7)).toBeNull();
  });
});

describe("a altura é relativa ao período, e os limites dizem-se", () => {
  it("**o maior dia é a barra mais alta, o menor é a mais baixa**", () => {
    const t = tendenciaEmBarras(serie([50, 60, 55]), 3)!;
    expect(t.minimo).toBe(50);
    expect(t.maximo).toBe(60);
    expect(t.barras[1].altura).toBeCloseTo(1, 6);
    expect(t.barras[0].altura).toBeLessThan(t.barras[2].altura!);
  });

  it("**o mínimo não fica a zero**", () => {
    /*
     * Uma barra de altura nenhuma é indistinguível de um dia sem medição — que
     * é exactamente a coisa que estas barras existem para separar.
     */
    const t = tendenciaEmBarras(serie([50, 60]), 2)!;
    expect(t.barras[0].altura!).toBeGreaterThan(0.1);
  });

  it("**tudo igual fica a meio**, não no topo nem no fundo", () => {
    // Cheias leriam como "no máximo todos os dias"; vazias, o contrário.
    const t = tendenciaEmBarras(serie([60, 60, 60]), 3)!;
    for (const b of t.barras) expect(b.altura).toBeCloseTo(0.5, 6);
  });

  it("e nenhuma altura sai do intervalo", () => {
    const t = tendenciaEmBarras(serie([10, 90, 50, null, 70]), 5)!;
    for (const b of t.barras) {
      if (b.altura === null) continue;
      expect(b.altura).toBeGreaterThanOrEqual(0);
      expect(b.altura).toBeLessThanOrEqual(1);
    }
  });

  it("**conta os dias que têm medição**, não os da janela", () => {
    const t = tendenciaEmBarras(serie([50, null, null, 56]), 4)!;
    expect(t.dias).toBe(2);
    expect(t.barras).toHaveLength(4);
  });
});
