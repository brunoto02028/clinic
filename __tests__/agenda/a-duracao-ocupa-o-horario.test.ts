/**
 * A duração ocupa o horário (106 T-2).
 *
 * O defeito que originou isto: o bloco tinha altura fixa. Uma consulta de 30
 * minutos e uma de 60 desenhavam igual, e o horário seguinte **parecia livre**
 * quando não estava.
 *
 * Os testes falam em minutos e pixels porque é isso que a pessoa vê. Nenhum
 * deles lê o código como texto.
 */

import { disporDia, dentroDaGrade } from "@/lib/agenda-layout";

const ESCALA = { alturaHoraPx: 56, alturaMinimaPx: 20 };
const HORA = (h: number, m = 0) => h * 60 + m;

describe("a duração ocupa o horário", () => {
  it("uma consulta de 60 minutos tem o dobro da altura de uma de 30", () => {
    const lugares = disporDia(
      [
        { id: "longa", inicioMin: HORA(9), duracaoMin: 60 },
        { id: "curta", inicioMin: HORA(11), duracaoMin: 30 },
      ],
      ESCALA
    );
    expect(lugares.get("longa")!.alturaPx).toBe(2 * lugares.get("curta")!.alturaPx);
  });

  it("uma hora de consulta mede uma hora de grade", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(9), duracaoMin: 60 }], ESCALA);
    expect(lugares.get("a")!.alturaPx).toBe(ESCALA.alturaHoraPx);
  });

  it("começa no minuto certo: 10:38 não é 10:00", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(10, 38), duracaoMin: 30 }], ESCALA);
    const dezEmPonto = (HORA(10) / 60) * ESCALA.alturaHoraPx;
    const onzeEmPonto = (HORA(11) / 60) * ESCALA.alturaHoraPx;
    const topo = lugares.get("a")!.topoPx;

    expect(topo).toBeGreaterThan(dezEmPonto);
    expect(topo).toBeLessThan(onzeEmPonto);
    expect(topo - dezEmPonto).toBeCloseTo((38 / 60) * ESCALA.alturaHoraPx, 5);
  });

  it("duas no mesmo horário aparecem lado a lado, nenhuma escondida", () => {
    const lugares = disporDia(
      [
        { id: "a", inicioMin: HORA(9), duracaoMin: 60 },
        { id: "b", inicioMin: HORA(9), duracaoMin: 60 },
      ],
      ESCALA
    );
    expect(lugares.get("a")!.colunas).toBe(2);
    expect(lugares.get("b")!.colunas).toBe(2);
    expect(new Set([lugares.get("a")!.coluna, lugares.get("b")!.coluna]).size).toBe(2);
  });

  it("a que invade a hora seguinte também divide espaço com quem está lá", () => {
    // Este é o caso que uma conta feita por linha de hora não enxerga: a de
    // 90 minutos nasce às 10:00 e ainda está ocupando o espaço às 11:00.
    const lugares = disporDia(
      [
        { id: "longa", inicioMin: HORA(10), duracaoMin: 90 },
        { id: "seguinte", inicioMin: HORA(11), duracaoMin: 30 },
      ],
      ESCALA
    );
    expect(lugares.get("longa")!.colunas).toBe(2);
    expect(lugares.get("seguinte")!.colunas).toBe(2);
    expect(lugares.get("longa")!.coluna).not.toBe(lugares.get("seguinte")!.coluna);
  });

  it("encostar não é sobrepor: consultas seguidas ficam com a largura inteira", () => {
    const lugares = disporDia(
      [
        { id: "a", inicioMin: HORA(10), duracaoMin: 60 },
        { id: "b", inicioMin: HORA(11), duracaoMin: 60 },
      ],
      ESCALA
    );
    expect(lugares.get("a")!.colunas).toBe(1);
    expect(lugares.get("b")!.colunas).toBe(1);
  });

  it("três ao mesmo tempo rendem três colunas distintas", () => {
    const lugares = disporDia(
      [
        { id: "a", inicioMin: HORA(14), duracaoMin: 45 },
        { id: "b", inicioMin: HORA(14, 15), duracaoMin: 45 },
        { id: "c", inicioMin: HORA(14, 30), duracaoMin: 45 },
      ],
      ESCALA
    );
    expect(new Set(["a", "b", "c"].map((id) => lugares.get(id)!.coluna)).size).toBe(3);
    expect(lugares.get("a")!.colunas).toBe(3);
  });

  it("uma consulta curta continua visível", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(9), duracaoMin: 15 }], ESCALA);
    expect(lugares.get("a")!.alturaPx).toBeGreaterThanOrEqual(ESCALA.alturaMinimaPx);
  });

  it("consulta sem duração registrada não vira um bloco invisível", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(9), duracaoMin: 0 }], ESCALA);
    expect(lugares.get("a")!.alturaPx).toBeGreaterThanOrEqual(ESCALA.alturaMinimaPx);
  });

  it("a curta desenhada no piso não esconde a que vem logo atrás", () => {
    // 15 minutos desenhados em 20px ocupam mais que 15 minutos de relógio.
    // A colisão é medida sobre o que aparece, senão o defeito volta.
    const lugares = disporDia(
      [
        { id: "curta", inicioMin: HORA(9), duracaoMin: 15 },
        { id: "logo-depois", inicioMin: HORA(9, 15), duracaoMin: 30 },
      ],
      ESCALA
    );
    expect(lugares.get("curta")!.colunas).toBe(2);
    expect(lugares.get("logo-depois")!.colunas).toBe(2);
  });

  it("a mesma agenda desenha igual, venha na ordem que vier", () => {
    const consultas = [
      { id: "b", inicioMin: HORA(9), duracaoMin: 60 },
      { id: "a", inicioMin: HORA(9), duracaoMin: 60 },
      { id: "c", inicioMin: HORA(15), duracaoMin: 30 },
    ];
    const primeiro = disporDia(consultas, ESCALA);
    const segundo = disporDia([...consultas].reverse(), ESCALA);
    for (const { id } of consultas) {
      expect(segundo.get(id)).toEqual(primeiro.get(id));
    }
  });

  it("um dia vazio não desenha nada", () => {
    expect(disporDia([], ESCALA).size).toBe(0);
  });
});

describe("o bloco não passa da moldura da grade", () => {
  // Achado do QA da T-2: a grade mostra 08:00–19:00, e uma consulta das 19:30
  // com uma hora de duração desenhava 28px para fora. Com altura fixa isso
  // nunca acontecia — quem criou o caso foi esta tarefa.
  const FIM = HORA(20) / 60 * ESCALA.alturaHoraPx;
  const COM_MOLDURA = { ...ESCALA, fimDaGradePx: FIM };

  it("a consulta das 19:30 acaba na borda, não depois dela", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(19, 30), duracaoMin: 60 }], COM_MOLDURA);
    const { topoPx, alturaPx } = lugares.get("a")!;
    expect(topoPx + alturaPx).toBeLessThanOrEqual(FIM);
  });

  it("e ela ainda é desenhada — aparar não é esconder", () => {
    const lugares = disporDia([{ id: "a", inicioMin: HORA(19, 30), duracaoMin: 60 }], COM_MOLDURA);
    expect(lugares.get("a")!.alturaPx).toBeGreaterThan(0);
  });

  it("quem cabe inteiro não é aparado", () => {
    const comMoldura = disporDia([{ id: "a", inicioMin: HORA(10), duracaoMin: 60 }], COM_MOLDURA);
    const sem = disporDia([{ id: "a", inicioMin: HORA(10), duracaoMin: 60 }], ESCALA);
    expect(comMoldura.get("a")!.alturaPx).toBe(sem.get("a")!.alturaPx);
  });

  it("aparar o desenho não apaga a colisão", () => {
    // A de 19:30 ainda ocupa o tempo das 20:00 na vida real; se a conta da
    // colisão usasse a altura aparada, a seguinte voltaria a se esconder.
    const lugares = disporDia(
      [
        { id: "longa", inicioMin: HORA(19, 30), duracaoMin: 90 },
        { id: "outra", inicioMin: HORA(19, 45), duracaoMin: 30 },
      ],
      COM_MOLDURA
    );
    expect(lugares.get("longa")!.colunas).toBe(2);
  });
});

describe("quem não aparece não disputa espaço", () => {
  // Achado do code review: a grade mostra 08:00–19:00, mas `disporDia` recebia
  // o dia inteiro. Uma consulta das 07:00 — invisível — continuava ocupando
  // coluna, e a das 08:00 desenhava em meia largura com a outra metade vazia.
  const PRIMEIRA = 8;
  const ULTIMA = 19;

  it("a consulta das 07:00 não está na grade", () => {
    expect(dentroDaGrade(HORA(7), PRIMEIRA, ULTIMA)).toBe(false);
  });

  it("a das 08:00 está, e a das 19:30 também", () => {
    expect(dentroDaGrade(HORA(8), PRIMEIRA, ULTIMA)).toBe(true);
    expect(dentroDaGrade(HORA(19, 30), PRIMEIRA, ULTIMA)).toBe(true);
  });

  it("a das 20:00 não está", () => {
    expect(dentroDaGrade(HORA(20), PRIMEIRA, ULTIMA)).toBe(false);
  });

  it("consulta sem minuto conhecido fica de fora, em vez de cair na hora zero", () => {
    expect(dentroDaGrade(undefined, PRIMEIRA, ULTIMA)).toBe(false);
    expect(dentroDaGrade(NaN, PRIMEIRA, ULTIMA)).toBe(false);
  });

  it("**sem a invisível, a visível volta a ter a largura inteira**", () => {
    const dia = [
      { id: "sete", inicioMin: HORA(7), duracaoMin: 90 },
      { id: "oito", inicioMin: HORA(8), duracaoMin: 60 },
    ];
    const comTodas = disporDia(dia, ESCALA);
    expect(comTodas.get("oito")!.colunas).toBe(2);

    const soAsDaGrade = dia.filter((c) => dentroDaGrade(c.inicioMin, PRIMEIRA, ULTIMA));
    const desenhadas = disporDia(soAsDaGrade, ESCALA);
    expect(desenhadas.get("oito")!.colunas).toBe(1);
    expect(desenhadas.get("oito")!.coluna).toBe(0);
  });
});
