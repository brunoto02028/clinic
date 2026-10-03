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
  /**
   * Se o papel sai com o traçado desenhado, ou só com a conclusão do aparelho.
   *
   * **Opcional de propósito.** Um binário instalado antes de a rota passar a
   * mandar este campo recebe `undefined`, e `undefined` não é "não tem" — é
   * "não sei". A tela não avisa nada nesse caso, que é exactamente o que ela
   * fazia antes; inventar o aviso a partir da ausência seria dizer a alguém que
   * o traçado falta quando ele está lá.
   *
   * `signalId` não serve para isto: ele diz que a Withings **tem** o sinal, não
   * que nós o fomos buscar.
   */
  temTracado?: boolean;
  /**
   * O nome do aparelho, **como a Withings o escreve** (`"ScanWatch 2"`).
   *
   * Opcional pela mesma razão do `temTracado`: um binário instalado antes de a
   * rota o mandar recebe `undefined`, e `undefined` não é "não tem nome" — é
   * "não sei". Aí a frase diz só *"o aparelho"*, que nunca é falso.
   */
  deviceName?: string | null;
  /** A gravação entrou pela ligação **da clínica**, ou seja: foi medida lá. */
  naClinica?: boolean;
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
 * O que o aparelho concluiu — **sem o sujeito** (122 T-9).
 *
 * **Sem a palavra "normal"**, que foi o que o QA da T-8 reprovou: a conclusão é
 * do aparelho, mas a regra da tela do paciente é categórica sobre vocabulário.
 * Dizer o que ele **não assinalou** é relato; dizer que está "normal" é uma nota
 * nossa sobre o coração de alguém.
 *
 * E **sem "o relógio"**, que era o sujeito cravado aqui. Desde a 122 T-2 o ECG
 * que o terapeuta grava num paciente com o aparelho da clínica entra na ficha
 * dele — e o paciente lia que *o relógio dele* tinha encontrado sinais de
 * fibrilhação auricular. Pode nem ter relógio.
 */
export const FRASE_DA_CONCLUSAO: Record<
  RegistoDeEcg["conclusao"],
  { en: string; pt: string }
> = {
  normal: {
    en: "flagged nothing",
    pt: "não assinalou nada",
  },
  fibrilacao: {
    en: "found signs of atrial fibrillation",
    pt: "encontrou sinais de fibrilação atrial",
  },
  inconclusivo: {
    en: "could not classify this recording",
    pt: "não conseguiu classificar este registro",
  },
};

/**
 * **Quem concluiu.** Nomear o que se sabe, nunca adivinhar — e **nunca nós**.
 *
 * A primeira versão desta função punha *"O aparelho da clínica"* como sujeito, e
 * o code review derrubou com o argumento certo: a conclusão é do aparelho e
 * nunca nossa, e *"o aparelho da clínica encontrou sinais de fibrilhação"*
 * lê-se como **a clínica encontrou**. É precisamente a linha que mantém este
 * produto fora de dispositivo médico.
 *
 * O sujeito é o aparelho — pelo nome que a Withings lhe dá, ou genérico. Que a
 * medição foi feita na clínica é **lugar**, e vai noutra linha
 * (`origemDoRegisto`). As duas verdades, sem nos pôr a concluir.
 *
 * O `trim` existe porque a ingestão guarda o nome como ele vem: um nome só com
 * espaços é truthy e produzia *"O    não assinalou nada"*.
 */
function sujeitoDaFrase(r: RegistoDeEcg, lang: "en" | "pt"): string {
  const nome = r.deviceName?.trim();
  if (nome) return lang === "pt" ? `O ${nome}` : `The ${nome}`;
  return lang === "pt" ? "O aparelho" : "The device";
}

/** A frase inteira, na língua de quem lê. */
export function fraseDaConclusao(r: RegistoDeEcg, lang: "en" | "pt"): string {
  const corpo = FRASE_DA_CONCLUSAO[r.conclusao];
  return `${sujeitoDaFrase(r, lang)} ${lang === "pt" ? corpo.pt : corpo.en}`;
}

/**
 * Onde foi medida — ou `null` quando não se sabe.
 *
 * `undefined` não é *"não foi na clínica"*: é *"não sei"*, e aí não se diz nada,
 * que é o que a tela fazia antes de este campo existir.
 */
export function origemDoRegisto(r: RegistoDeEcg, lang: "en" | "pt"): string | null {
  if (!r.naClinica) return null;
  return lang === "pt" ? "Medido na clínica" : "Measured at the clinic";
}

/** Só a fibrilhação muda a cor. As outras duas são relato, não achado. */
export function ehAchado(c: RegistoDeEcg["conclusao"]): boolean {
  return c === "fibrilacao";
}
