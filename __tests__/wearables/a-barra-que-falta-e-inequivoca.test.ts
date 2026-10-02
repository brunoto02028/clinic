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

/**
 * O "hoje" dos testes.
 *
 * A janela acaba **hoje**, e não no último dia medido — senão quem parou de
 * usar o relógio há um mês vê catorze barras densas que se lêem como as últimas
 * duas semanas. Fixar o dia aqui é o que impede estes testes de mudarem de
 * resultado conforme a data em que correm.
 */
const HOJE = new Date("2026-10-02T12:00:00.000Z");

/**
 * Dias seguidos a **acabar hoje**, com `null` onde não houve medição.
 *
 * Acabam hoje porque é aí que a janela acaba. Uma série que termina há duas
 * semanas é o caso do relógio parado, e tem o seu próprio teste.
 */
const serie = (valores: Array<number | null>) =>
  valores.map((valor, i) => {
    const d = new Date(HOJE.getTime());
    d.setUTCDate(d.getUTCDate() - (valores.length - 1 - i));
    return { dia: d.toISOString().slice(0, 10), valor };
  });

/** O dia de hoje, e os anteriores, em `YYYY-MM-DD`. */
const diaAtras = (n: number) => {
  const d = new Date(HOJE.getTime());
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

describe("o dia sem medição fica no lugar dele", () => {
  it("**uma barra por dia da janela**, e não por dia com dado", () => {
    /*
     * Tirar o dia sem medição encolheria tudo o que vem depois para a
     * esquerda — o mesmo erro que encurtou uma gravação de ECG de 30 s para
     * 29,003 s, e que aqui faria *"há três dias"* parecer *"ontem"*.
     */
    const t = tendenciaEmBarras(serie([50, null, null, 54, 56]), 5, HOJE)!;
    expect(t.barras).toHaveLength(5);
    expect(t.barras.map((b) => b.altura === null)).toEqual([false, true, true, false, false]);
  });

  it("**o buraco não tem altura** — e por isso não se desenha", () => {
    const t = tendenciaEmBarras(serie([50, null, 54]), 3, HOJE)!;
    expect(t.barras[1].altura).toBeNull();
    expect(t.barras[1].valor).toBeNull();
  });

  it("**e os dias são consecutivos**, mesmo os que faltam", () => {
    const t = tendenciaEmBarras(serie([50, null, 54]), 3, HOJE)!;
    expect(t.barras.map((b) => b.dia)).toEqual([diaAtras(2), diaAtras(1), diaAtras(0)]);
  });

  it("**um dia que não aparece na série é um buraco**, não uma ausência", () => {
    /*
     * A série vem do banco só com os dias que têm linha. A janela é preenchida
     * a partir do dia mais recente para trás, e os que faltarem ficam vazios no
     * sítio certo.
     */
    const salteada = [
      { dia: diaAtras(4), valor: 50 },
      { dia: diaAtras(0), valor: 58 },
    ];
    const t = tendenciaEmBarras(salteada, 5, HOJE)!;
    expect(t.barras).toHaveLength(5);
    expect(t.barras.map((b) => b.valor)).toEqual([50, null, null, null, 58]);
  });
});

describe("a janela", () => {
  it("**acaba hoje**, e não no último dia medido", () => {
    const t = tendenciaEmBarras(serie([50, 52, 54]), 3, HOJE)!;
    expect(t.barras[t.barras.length - 1].dia).toBe(diaAtras(0));
    expect(t.ate).toBe(diaAtras(0));
  });

  it("**um relógio parado há um mês desenha barras à esquerda e vazio à direita**", () => {
    /*
     * **Achado do code review.** A janela ancorava no último dia **com** dado:
     * quem parou de usar o relógio há um mês via catorze barras densas que se
     * liam como as últimas duas semanas, e nada no gráfico dizia o contrário.
     *
     * É o mesmo raciocínio que este ficheiro já defende para os buracos — *"há
     * três dias" não pode parecer "ontem"* — aplicado ao fim da janela.
     */
    const antiga = [
      { dia: "2026-09-01", valor: 50 },
      { dia: "2026-09-02", valor: 52 },
    ];

    /*
     * Nenhuma das duas cabe nos últimos sete dias, logo **não há tendência** —
     * e não há barras. O cartão continua a mostrar o número e a linha *"leitura
     * de há N dias"* que já existe acima; o que desaparece é o gráfico que
     * afirmava duas semanas de medições.
     */
    expect(tendenciaEmBarras(antiga, 7, HOJE)).toBeNull();

    /* E com a janela suficientemente larga, elas aparecem **no sítio delas**. */
    const larga = tendenciaEmBarras(antiga, 40, HOJE)!;
    expect(larga.ate).toBe(diaAtras(0));
    expect(larga.ultimoComDado).toBe("2026-09-02");
    const ultimasSete = larga.barras.slice(-7);
    expect(ultimasSete.every((b) => b.altura === null)).toBe(true);
  });

  it("**e a tendência diz de quando é o último dado**", () => {
    // Para a tela poder dizê-lo, em vez de deixar quem lê supor que é de hoje.
    const t = tendenciaEmBarras(serie([50, 52, null, null]), 4, HOJE)!;
    expect(t.ultimoComDado).toBe(diaAtras(2));
    expect(t.de).toBe(diaAtras(3));
    expect(t.ate).toBe(diaAtras(0));
  });

  it("**e corta o que é mais antigo do que ela** — catorze fios de um pixel não se lêem", () => {
    const t = tendenciaEmBarras(serie([10, 20, 30, 40, 50]), 3, HOJE)!;
    expect(t.barras).toHaveLength(3);
    expect(t.barras.map((b) => b.valor)).toEqual([30, 40, 50]);
    /* E os limites são os da janela mostrada, não os da série inteira. */
    expect(t.minimo).toBe(30);
  });

  it("uma janela maior do que a série enche-se de buracos à esquerda", () => {
    const t = tendenciaEmBarras(serie([50, 52]), 5, HOJE)!;
    expect(t.barras.map((b) => b.valor)).toEqual([null, null, null, 50, 52]);
  });
});

describe("quando não há tendência, não se desenha", () => {
  it("**um dia só não é tendência**", () => {
    // Uma barra sozinha ao lado de seis vazios sugere uma série que não existe.
    expect(MINIMO_DE_DIAS).toBe(2);
    expect(tendenciaEmBarras(serie([50]), 7, HOJE)).toBeNull();
  });

  it("nenhum dado, nenhuma caixa", () => {
    expect(tendenciaEmBarras(serie([null, null, null]), 3, HOJE)).toBeNull();
    expect(tendenciaEmBarras([], 7, HOJE)).toBeNull();
    expect(tendenciaEmBarras(null, 7, HOJE)).toBeNull();
    expect(tendenciaEmBarras(undefined, 7, HOJE)).toBeNull();
  });

  it("e uma data ilegível não entra", () => {
    expect(tendenciaEmBarras([{ dia: "não é data", valor: 50 }], 7, HOJE)).toBeNull();
  });
});

describe("a altura é relativa ao período, e os limites dizem-se", () => {
  it("**o maior dia é a barra mais alta, o menor é a mais baixa**", () => {
    const t = tendenciaEmBarras(serie([50, 60, 55]), 3, HOJE)!;
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
    const t = tendenciaEmBarras(serie([50, 60]), 2, HOJE)!;
    expect(t.barras[0].altura!).toBeGreaterThan(0.1);
  });

  it("**tudo igual fica a meio**, não no topo nem no fundo", () => {
    // Cheias leriam como "no máximo todos os dias"; vazias, o contrário.
    const t = tendenciaEmBarras(serie([60, 60, 60]), 3, HOJE)!;
    for (const b of t.barras) expect(b.altura).toBeCloseTo(0.5, 6);
  });

  it("e nenhuma altura sai do intervalo", () => {
    const t = tendenciaEmBarras(serie([10, 90, 50, null, 70]), 5, HOJE)!;
    for (const b of t.barras) {
      if (b.altura === null) continue;
      expect(b.altura).toBeGreaterThanOrEqual(0);
      expect(b.altura).toBeLessThanOrEqual(1);
    }
  });

  it("**conta os dias que têm medição**, não os da janela", () => {
    const t = tendenciaEmBarras(serie([50, null, null, 56]), 4, HOJE)!;
    expect(t.dias).toBe(2);
    expect(t.barras).toHaveLength(4);
  });
});
