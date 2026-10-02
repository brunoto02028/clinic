import { lerEcg, exigeAtencao } from "@/lib/ecg-record";
import { serieDaMetrica } from "@/lib/onde-mora-a-metrica";

/**
 * O desvio que a clínica precisa ver (099 T-6).
 *
 * ## Por que existir
 *
 * Monitorar sem ninguém olhar é guardar dado. O valor do acompanhamento
 * contínuo está em alguém notar a tempo — e "alguém" aqui é gente da clínica,
 * nunca um texto automático no telefone de quem foi medido.
 *
 * O caso que torna isto urgente já estava acontecendo: o ScanWatch conclui
 * fibrilação atrial, nós guardamos, e **ninguém era avisado**.
 *
 * ## A régua é a pessoa, não a população
 *
 * Uma frequência de repouso de 48 é desvio em quem vivia em 70 e é o normal de
 * quem vive em 50. Então a comparação é sempre contra **a linha de base da
 * própria pessoa**, medida em desvios-padrão dela.
 *
 * Duas travas contra alarme falso, e as duas são necessárias:
 *
 * **Base curta não gera desvio.** Com poucos dias não há linha de base — só
 * uma média instável, e uma seta desenhada sobre ela seria ruído com cara de
 * achado.
 *
 * **E variação pequena também não.** Uma pessoa muito regular tem desvio-padrão
 * minúsculo, e aí dois batimentos viram "três sigmas". Por isso cada métrica
 * tem um mínimo absoluto abaixo do qual nada é desvio, por mais significativo
 * que o número pareça.
 *
 * ## O que este arquivo não faz
 *
 * Não diz o que o desvio significa, não sugere conduta e não fala com o
 * paciente. Ele aponta: *"isto mudou, era assim antes"*.
 */

export type MetricaMonitorada = "restingHr" | "hrv" | "spo2" | "sleepDuration";

export interface RegraDaMetrica {
  /** Que lado importa. Uma SpO2 que **sobe** não é achado. */
  direcao: "queda" | "alta" | "ambas";
  /** Abaixo disto não é desvio, por mais "significativo" que o z-score diga. */
  minimoAbsoluto: number;
  rotulo: { en: string; pt: string };
  unidade: string;
}

export const REGRAS: Record<MetricaMonitorada, RegraDaMetrica> = {
  restingHr: {
    direcao: "ambas",
    minimoAbsoluto: 5,
    rotulo: { en: "Resting heart rate", pt: "Frequência de repouso" },
    unidade: " bpm",
  },
  hrv: {
    direcao: "queda",
    minimoAbsoluto: 8,
    rotulo: { en: "HRV", pt: "VFC" },
    unidade: " ms",
  },
  spo2: {
    direcao: "queda",
    minimoAbsoluto: 3,
    rotulo: { en: "SpO2", pt: "SpO2" },
    unidade: "%",
  },
  sleepDuration: {
    direcao: "queda",
    minimoAbsoluto: 60,
    rotulo: { en: "Sleep", pt: "Sono" },
    unidade: " min",
  },
};

/** Dias mínimos de linha de base. Abaixo disto não há com o que comparar. */
export const DIAS_MINIMOS_DE_BASE = 10;
/** Quantos desvios-padrão da própria pessoa contam como fora do normal dela. */
export const SIGMAS = 2.5;

export interface PontoDaSerie {
  dia: string;
  valor: number | null;
}

export interface Desvio {
  /** Identifica este achado, para marcar como visto sem duplicar. */
  chave: string;
  tipo: "metrica" | "ecg";
  metrica?: MetricaMonitorada;
  dia: string;
  valor: number;
  /** A média da própria pessoa antes disto. */
  base: number;
  /** Para que lado foi. */
  sentido: "queda" | "alta";
  /** O que o aparelho concluiu, quando o achado é de ECG. */
  conclusao?: string;
}

function media(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function desvioPadrao(xs: number[], m: number): number {
  if (xs.length < 2) return 0;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * O último valor da série está fora do que é normal **para esta pessoa**?
 *
 * A linha de base é tudo menos o último dia — comparar o último consigo mesmo
 * diluiria justamente o que se quer detectar.
 */
export function detectarDesvio(
  metrica: MetricaMonitorada,
  serie: PontoDaSerie[]
): Desvio | null {
  const regra = REGRAS[metrica];
  const comDado = serie
    .filter((p) => typeof p.valor === "number")
    .sort((a, b) => a.dia.localeCompare(b.dia)) as Array<{ dia: string; valor: number }>;

  if (comDado.length < DIAS_MINIMOS_DE_BASE + 1) return null;

  const ultimo = comDado[comDado.length - 1];
  const base = comDado.slice(0, -1).map((p) => p.valor);
  const m = media(base);
  const sd = desvioPadrao(base, m);
  if (sd === 0) return null;

  const diferenca = ultimo.valor - m;
  const sentido: "queda" | "alta" = diferenca < 0 ? "queda" : "alta";

  if (regra.direcao !== "ambas" && regra.direcao !== sentido) return null;
  if (Math.abs(diferenca) < regra.minimoAbsoluto) return null;
  if (Math.abs(diferenca) / sd < SIGMAS) return null;

  return {
    chave: `${metrica}:${ultimo.dia}`,
    tipo: "metrica",
    metrica,
    dia: ultimo.dia,
    valor: Math.round(ultimo.valor * 10) / 10,
    base: Math.round(m * 10) / 10,
    sentido,
  };
}

/**
 * Os achados de um paciente a partir dos pontos dele.
 *
 * A fibrilação atrial **não passa por linha de base**: ela é a conclusão do
 * aparelho sobre um evento, não um número que oscila. Exigir dez dias de
 * histórico para mostrá-la seria esconder exatamente o achado que existe para
 * ser visto.
 */
/**
 * Uma gravação de ECG, como o `EcgRecording` a guarda.
 *
 * **É daqui que a fibrilhação passou a vir** (119 T-2). Antes o ECG vivia no
 * `WearableDataPoint`, e esta função lia-o de lá.
 */
export interface GravacaoDeEcg {
  id?: string;
  recordedAt: Date | string;
  heartRate?: number | null;
  conclusao?: string | null;
}

export function desviosDosPontos(
  pontos: Array<{
    dataType?: string | null;
    dataDate?: string | null;
    restingHr?: number | null;
    hrv?: number | null;
    spo2?: number | null;
    sleepDuration?: number | null;
    rawPayload?: string | null;
  }>,
  /**
   * As gravações de ECG — **e sem elas a fibrilhação não chega à clínica**.
   *
   * Em 02/10/2026 o ECG mudou de casa: a ingestão passou a escrever só no
   * `EcgRecording`, e esta função continuou a ler os pontos diários. Resultado:
   * o app mostrava a fibrilhação a vermelho e a fila *"Worth a look"* ficava
   * **vazia**. Era o estado anterior à 099 T-6 reposto por outra porta, e
   * nenhum teste apanhou — o teste fabricava um `WearableDataPoint`, que é um
   * estado que o banco já não produz.
   *
   * Opcional para não partir chamadores antigos, mas quem não a passar não vê
   * fibrilhação nenhuma. Os pontos continuam a ser lidos pela mesma razão: um
   * registo trazido do tempo em que o ECG vivia lá ainda vale.
   */
  ecgs: GravacaoDeEcg[] = []
): Desvio[] {
  const achados: Desvio[] = [];
  /* Uma gravação não entra duas vezes por estar nas duas fontes. */
  const jaVistos = new Set<string>();

  const anotarFibrilhacao = (quando: string, bpm: number | null | undefined) => {
    const dia = quando.slice(0, 10);
    /*
     * A chave carrega o **instante**, não o dia. Duas fibrilhações no mesmo dia
     * são dois achados: colapsá-las repetiria, na fila da clínica, o mesmo erro
     * que a 119 T-2 tirou do banco.
     */
    const chave = `ecg_afib:${quando}`;
    if (jaVistos.has(chave)) return;
    jaVistos.add(chave);
    achados.push({
      chave,
      tipo: "ecg",
      dia,
      valor: bpm ?? 0,
      base: 0,
      sentido: "alta",
      conclusao: "fibrilacao",
    });
  };

  for (const e of ecgs) {
    if (e?.conclusao !== "fibrilacao") continue;
    const quando =
      e.recordedAt instanceof Date
        ? e.recordedAt.toISOString()
        : String(e.recordedAt ?? "");
    if (!quando) continue;
    anotarFibrilhacao(quando, e.heartRate);
  }

  for (const p of pontos) {
    const ecg = lerEcg(p);
    if (ecg && exigeAtencao(ecg)) {
      anotarFibrilhacao(String(ecg.recordedAt ?? p.dataDate ?? ""), ecg.heartRate);
    }
  }

  /**
   * **O balde vem do mapa** (119 T-9).
   *
   * Isto procurava `restingHr`, `hrv` e `spo2` em `BODY` — um `dataType` que a
   * ingestão da Withings **nunca escreve**. O alerta da clínica para essas três
   * nunca disparou, para nenhum paciente, e não havia como saber: uma série
   * vazia é indistinguível de uma série estável.
   */
  const serieDe = (campo: MetricaMonitorada): PontoDaSerie[] =>
    serieDaMetrica(pontos as any[], campo).map((v) => ({ dia: v.dia, valor: v.valor }));

  for (const metricas of [
    ["restingHr", "hrv", "spo2"] as MetricaMonitorada[],
    ["sleepDuration"] as MetricaMonitorada[],
  ] as const) {
    for (const metrica of metricas) {
      const d = detectarDesvio(metrica, serieDe(metrica));
      if (d) achados.push(d);
    }
  }

  // Mais recente primeiro, e a fibrilação sempre no topo: ela não espera a
  // ordem cronológica para ser lida.
  return achados.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "ecg" ? -1 : 1;
    return b.dia.localeCompare(a.dia);
  });
}
