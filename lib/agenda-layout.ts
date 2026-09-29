/**
 * Onde cada consulta fica desenhada na grade da semana.
 *
 * Isto existe separado da tela por um motivo: a agenda é a informação
 * principal de quem marca. Um bloco de altura fixa faz uma consulta de 30
 * minutos e uma de 60 parecerem iguais, e faz o horário seguinte **parecer
 * livre** quando não está. Quem marca por cima descobre no dia.
 *
 * A régua é uma só — `alturaHoraPx` — e tudo sai dela: a altura do bloco, o
 * minuto em que ele começa, e quem colide com quem.
 */

export type ConsultaNaGrade = {
  id: string;
  /** Minutos desde a meia-noite, no fuso da clínica. */
  inicioMin: number;
  duracaoMin: number;
};

export type EscalaDaGrade = {
  /** Pixels que uma hora de relógio ocupa na tela. */
  alturaHoraPx: number;
  /**
   * Piso de altura. Uma consulta de 15 minutos tem de continuar legível,
   * mesmo que desenhe um pouco maior que o tempo real.
   */
  alturaMinimaPx: number;
  /**
   * Onde a grade acaba, em pixels desde a meia-noite.
   *
   * A grade mostra 08:00–19:00; uma consulta das 19:30 com uma hora de duração
   * desenhava 28px **fora** da moldura. Com altura fixa isso nunca acontecia —
   * foi esta tarefa que criou o caso, e o QA o encontrou.
   */
  fimDaGradePx?: number;
};

export type LugarNaGrade = {
  /** Pixels desde a meia-noite da grade. */
  topoPx: number;
  alturaPx: number;
  /** Coluna dentro do grupo que se sobrepõe — 0 é a primeira. */
  coluna: number;
  /** Quantas colunas o grupo precisou. 1 = ninguém colide com esta. */
  colunas: number;
};

/**
 * Distribui as consultas de um dia.
 *
 * A colisão é medida sobre o que **aparece**, não sobre o tempo nominal: uma
 * consulta de 15 minutos desenhada no piso de altura ocupa mais espaço que 15
 * minutos, e esconder a seguinte atrás dela seria o mesmo defeito de novo.
 */
/**
 * Esta consulta é desenhada na grade?
 *
 * A grade mostra uma faixa de horas. Quem cai fora dela não aparece — e,
 * enquanto continuava entrando na conta de sobreposição, roubava coluna de quem
 * aparece: uma consulta das 07:00 invisível fazia a das 08:00 desenhar em meia
 * largura, com a outra metade vazia e nada explicando por quê.
 *
 * O sumiço em si é outro assunto (106 T-4) e a decisão é do Bruno. Aqui só se
 * garante que quem não aparece não disputa espaço.
 */
export function dentroDaGrade(
  inicioMin: number | null | undefined,
  primeiraHora: number,
  ultimaHora: number
): boolean {
  if (!Number.isFinite(inicioMin as number)) return false;
  const hora = Math.floor((inicioMin as number) / 60);
  return hora >= primeiraHora && hora <= ultimaHora;
}

export function disporDia(
  consultas: ConsultaNaGrade[],
  escala: EscalaDaGrade
): Map<string, LugarNaGrade> {
  const { alturaHoraPx, alturaMinimaPx, fimDaGradePx } = escala;
  const minutosMinimos = (alturaMinimaPx / alturaHoraPx) * 60;

  const ordenadas = consultas
    .map((c) => {
      const duracao = Math.max(c.duracaoMin > 0 ? c.duracaoMin : 0, minutosMinimos);
      return { id: c.id, inicio: c.inicioMin, fim: c.inicioMin + duracao, duracao };
    })
    // Empate desfeito pelo id para que a mesma agenda desenhe sempre igual.
    .sort((a, b) => a.inicio - b.inicio || a.fim - b.fim || a.id.localeCompare(b.id));

  const lugares = new Map<string, LugarNaGrade>();

  let grupo: typeof ordenadas = [];
  let fimDoGrupo = -Infinity;
  const fecharGrupo = () => {
    if (!grupo.length) return;
    // Guloso: cada uma vai para a primeira coluna já livre naquele instante.
    const fimDaColuna: number[] = [];
    const colunaDe = new Map<string, number>();
    for (const c of grupo) {
      let col = fimDaColuna.findIndex((f) => f <= c.inicio);
      if (col === -1) {
        col = fimDaColuna.length;
        fimDaColuna.push(c.fim);
      } else {
        fimDaColuna[col] = c.fim;
      }
      colunaDe.set(c.id, col);
    }
    for (const c of grupo) {
      const topoPx = (c.inicio / 60) * alturaHoraPx;
      const alturaCheia = (c.duracao / 60) * alturaHoraPx;
      // A colisão foi calculada sobre o tempo cheio; só o desenho é aparado.
      const alturaPx =
        fimDaGradePx === undefined
          ? alturaCheia
          : Math.max(0, Math.min(alturaCheia, fimDaGradePx - topoPx));
      lugares.set(c.id, {
        topoPx,
        alturaPx,
        coluna: colunaDe.get(c.id) ?? 0,
        colunas: fimDaColuna.length,
      });
    }
    grupo = [];
    fimDoGrupo = -Infinity;
  };

  for (const c of ordenadas) {
    // Encostar não é sobrepor: 10:00–11:00 e 11:00–12:00 são duas consultas
    // seguidas, e cada uma merece a largura inteira.
    if (c.inicio >= fimDoGrupo) fecharGrupo();
    grupo.push(c);
    fimDoGrupo = Math.max(fimDoGrupo, c.fim);
  }
  fecharGrupo();

  return lugares;
}
