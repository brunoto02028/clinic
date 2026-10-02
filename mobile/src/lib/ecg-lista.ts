/**
 * A lista de ECG, agrupada como a pessoa a lê (119 T-3).
 *
 * ## Porque isto não é uma linha por dia
 *
 * Era. Até 02/10/2026 um ECG era guardado com chave `(utilizador, dia, tipo)` —
 * a chave de um **total do dia** — e duas gravações no mesmo dia colapsavam
 * numa. O Bruno fez duas em 01/10, às 22:44 e às 23:54, e ficou a última. Não
 * aparecia buraco nenhum: aparecia um registo perfeitamente plausível.
 *
 * ## O dia é de quem pergunta
 *
 * O servidor manda o **instante**. O dia sai daqui, no fuso do aparelho de quem
 * está a ler. Guardar um dia no servidor obrigava a escolher um fuso por toda a
 * gente — e a escolha era UTC, que punha um ECG das 00:30 em Londres no verão
 * no dia anterior.
 *
 * ## O que esta tela nunca faz
 *
 * Não lê o traçado, e não acrescenta palavra sobre o ritmo. A conclusão é do
 * aparelho; nós dizemos **qual foi e quando**.
 */

export interface RegistoDeEcg {
  id: string;
  recordedAt: string;
  heartRate: number | null;
  conclusao: "normal" | "fibrilacao" | "inconclusivo";
  signalId: string | null;
}

export interface DiaDeEcg {
  /** `YYYY-MM-DD` no fuso de quem lê. */
  dia: string;
  /** Há quantos dias — `0` é hoje, `1` ontem. */
  diasAtras: number;
  registos: RegistoDeEcg[];
}

function duasCasas(n: number): string {
  return String(n).padStart(2, "0");
}

/** O dia local de um instante, pelas partes da data — nunca por `toISOString`. */
export function diaLocalDe(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${duasCasas(d.getMonth() + 1)}-${duasCasas(d.getDate())}`;
}

/** A hora local, como se escreve num relógio. */
export function horaLocalDe(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${duasCasas(d.getHours())}:${duasCasas(d.getMinutes())}`;
}

/**
 * Agrupa por dia local, do mais recente para o mais antigo, e **dentro do dia
 * também** — às 23:54 antes das 22:44.
 *
 * O servidor já manda ordenado, mas um agrupador que dependa da ordem de quem o
 * chama é um agrupador que um dia mostra a lista ao contrário sem ninguém
 * perceber porquê.
 */
export function agruparPorDia(registos: RegistoDeEcg[], hoje: string): DiaDeEcg[] {
  const porDia = new Map<string, RegistoDeEcg[]>();

  for (const r of registos) {
    const dia = diaLocalDe(r.recordedAt);
    if (!dia) continue; // um instante ilegível não inventa um dia
    const lista = porDia.get(dia);
    if (lista) lista.push(r);
    else porDia.set(dia, [r]);
  }

  const partes = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  };

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, lista]) => {
      const a = partes(dia);
      const b = partes(hoje);
      return {
        dia,
        diasAtras:
          Number.isNaN(a) || Number.isNaN(b) ? 0 : Math.round((b - a) / 86_400_000),
        registos: [...lista].sort((x, y) =>
          y.recordedAt.localeCompare(x.recordedAt)
        ),
      };
    });
}

/**
 * A frase da conclusão, na língua do aparelho de quem lê.
 *
 * **Sem a palavra "normal"**, que foi o que o QA da T-8 reprovou: a conclusão é
 * do relógio, mas a regra da tela do paciente é categórica sobre vocabulário.
 * Dizer o que o relógio **não assinalou** é relato; dizer que está "normal" é
 * uma nota nossa sobre o coração de alguém.
 */
export const FRASE_DA_CONCLUSAO: Record<
  RegistoDeEcg["conclusao"],
  { en: string; pt: string }
> = {
  normal: {
    en: "The watch flagged nothing",
    pt: "O relógio não assinalou nada",
  },
  fibrilacao: {
    en: "The watch found signs of atrial fibrillation",
    pt: "O relógio encontrou sinais de fibrilhação atrial",
  },
  inconclusivo: {
    en: "The watch could not classify this recording",
    pt: "O relógio não conseguiu classificar este registo",
  },
};

/** Só a fibrilhação muda a cor. As outras duas são relato, não achado. */
export function ehAchado(c: RegistoDeEcg["conclusao"]): boolean {
  return c === "fibrilacao";
}
