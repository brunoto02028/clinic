import { prisma } from "@/lib/db";
import { serieDaMetrica, comoSeEscreve } from "@/lib/onde-mora-a-metrica";
import { lerEcg, type RegistroDeEcg } from "@/lib/ecg-record";

/**
 * O histórico de acompanhamento de um paciente, num período (099 T-4).
 *
 * ## O que faltava
 *
 * `lib/patient-report.ts` já reunia triagem, avaliação, protocolos e notas
 * SOAP — o que está **no cadastro**. Nada do que o paciente viveu entrava
 * nele: nem o relógio, nem a pressão, nem a dor por data, nem se ele fez os
 * exercícios. O relatório falava do plano e não do mês.
 *
 * ## A regra deste arquivo
 *
 * **Fatos, mudanças e datas.** Nada aqui conclui coisa alguma.
 *
 * "FC de repouso 4 bpm menor que há 30 dias" é o que aconteceu; "você está
 * mais bem condicionado" é leitura clínica, e quem a faz assina embaixo. Um
 * texto automático que interpreta erra sozinho, semana após semana, na caixa
 * de entrada de quem confia nele.
 *
 * Por isso também não há faixa de normalidade, semáforo nem alerta: a
 * comparação é sempre **da pessoa com ela mesma**.
 */

export interface ResumoDaMetrica {
  /** A média da metade mais recente do período. */
  atual: number | null;
  /** A média da metade anterior — a base da comparação. */
  anterior: number | null;
  /** `atual - anterior`, quando as duas existem. */
  variacao: number | null;
  /** Quantos dias do período têm dado. A ausência é informação. */
  dias: number;
}

/**
 * Compara a pessoa com ela mesma, partindo o período ao meio.
 *
 * Sem dado suficiente **não inventa tendência**: dois dias medidos não dizem
 * nada sobre um mês, e uma seta para baixo em cima de dois pontos é pior que
 * nenhuma seta.
 */
export function resumirSerie(
  valores: Array<{ dia: string; valor: number | null }>,
  /**
   * O nome do campo, quando ele muda a forma do número.
   *
   * `Steps 919.5` foi ao papel do paciente: a média do período impressa como se
   * fosse uma contagem. Ninguém deu meio passo — e um número assim faz duvidar
   * dos outros que estão ao lado, que estão certos. Ver `SAO_CONTAGEM`.
   */
  campo?: string
): ResumoDaMetrica {
  const comDado = valores.filter((v) => v.valor !== null && v.valor !== undefined);
  const dias = comDado.length;
  if (dias === 0) return { atual: null, anterior: null, variacao: null, dias: 0 };

  const ordenados = [...comDado].sort((a, b) => a.dia.localeCompare(b.dia));
  const meio = Math.floor(ordenados.length / 2);
  const media = (xs: typeof ordenados) =>
    xs.length ? xs.reduce((s, x) => s + (x.valor as number), 0) / xs.length : null;

  /**
   * **`atual` é a média de todos os dias com dado** (achado do QA comparativo).
   *
   * Era a média da **segunda metade** quando havia 4 ou mais dias — enquanto a
   * legenda impressa dizia, e continua a dizer, *"média dos N dias com dados"*,
   * com `N` a contar **todos** eles.
   *
   * Medido no papel: passos de 4000, 3000, 249 e 1590 imprimiam **920**
   * rotulados *"média dos 4 dias"*; a média dos quatro é **2209,75**. Um erro de
   * 2,4× num documento clínico, com a legenda a descrevê-lo mal.
   *
   * E a mesma linha carregava as duas descrições em contradição: a variação
   * dizia *"2580 abaixo da primeira metade do período"* — honesto — e a legenda
   * ao lado dizia outra coisa.
   *
   * A comparação entre metades continua a existir, e é de onde a **variação**
   * sai: ela está rotulada como comparação e não como média.
   */
  const metadeAntiga = ordenados.length >= 4 ? media(ordenados.slice(0, meio)) : null;
  const metadeRecente = ordenados.length >= 4 ? media(ordenados.slice(meio)) : null;
  const anterior = metadeAntiga;
  const atual = media(ordenados);

  const umaCasa = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
  const escrever = (n: number | null) => (campo ? comoSeEscreve(campo, umaCasa(n)) : umaCasa(n));

  return {
    atual: escrever(atual),
    anterior: escrever(anterior),
    /*
     * A variação continua a ser **metade contra metade** — é o que a frase
     * impressa diz: *"N abaixo da primeira metade do período"*. Compará-la com a
     * média do período inteiro daria um número menor do que a mudança real,
     * porque a própria média já contém a metade antiga.
     */
    variacao:
      metadeRecente === null || metadeAntiga === null
        ? null
        : escrever(metadeRecente - metadeAntiga),
    dias,
  };
}

/**
 * A pressão por dia, a partir das leituras (118 T-8).
 *
 * Ela não vem do `WearableDataPoint`: vem leitura a leitura do
 * `BloodPressureReading`, com a hora. Para a linha, o dia é a unidade — como em
 * todas as outras métricas.
 *
 * **Um dia com três medições é um ponto, não três.** Senão uma manhã em que a
 * pessoa mediu de hora a hora desenha um pico que é só diligência dela, e a
 * linha diz que a pressão subiu quando o que subiu foi o cuidado.
 *
 * O dia é em UTC, como o resto deste ficheiro. Para quem mede às 23h num fuso a
 * leste isso cai no dia seguinte — é uma imprecisão conhecida e **partilhada com
 * as outras séries**; corrigi-la só aqui faria a pressão contar dias diferentes
 * das restantes, o que é pior do que o erro.
 *
 * Vive fora do `getMonitoringData` porque é a parte verificável: lá dentro
 * precisaria do banco, e duas mutações sobreviveram enquanto ela esteve lá.
 */
export function pressaoPorDia(
  leituras: Array<{ systolic?: unknown; diastolic?: unknown; measuredAt?: unknown }> | null | undefined,
  campo: "systolic" | "diastolic"
): Array<{ dia: string; valor: number }> {
  if (!Array.isArray(leituras)) return [];

  const soma = new Map<string, { total: number; n: number }>();
  for (const r of leituras) {
    /*
     * **`Number(null)` é `0`**, e `Number("")` também. Uma sistólica em falta
     * virava uma leitura de 0 mmHg — que não é a pressão de ninguém, e puxaria a
     * média do dia para baixo sem nada a denunciar.
     */
    const bruto = (r as any)?.[campo];
    if (bruto === null || bruto === undefined || bruto === "") continue;
    const v = Number(bruto);
    if (!Number.isFinite(v)) continue;
    const d = new Date((r as any)?.measuredAt);
    if (Number.isNaN(d.getTime())) continue;
    const dia = d.toISOString().split("T")[0];
    const a = soma.get(dia) ?? { total: 0, n: 0 };
    a.total += v;
    a.n += 1;
    soma.set(dia, a);
  }

  return [...soma.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, a]) => ({ dia, valor: Math.round((a.total / a.n) * 10) / 10 }));
}

export interface DadosDeMonitoramento {
  periodo: { de: string; ate: string; dias: number };
  /**
   * A série diária de cada sinal, com os buracos onde eles estão (118 T-8).
   *
   * Existe para o papel poder desenhar a linha. Quem desenha decide o que fazer
   * com os buracos, e a resposta é **não os atravessar**.
   */
  series?: Record<string, Array<{ dia: string; valor: number | null }>>;
  /** As fases da última noite que as trouxe, ou `null`. */
  fasesDoSono?: {
    dia: string;
    profundo: number;
    leve: number;
    rem: number;
    acordado: number;
  } | null;
  sinais: {
    sono: ResumoDaMetrica;
    fcRepouso: ResumoDaMetrica;
    hrv: ResumoDaMetrica;
    spo2: ResumoDaMetrica;
    passos: ResumoDaMetrica;
  };
  temSinais: boolean;
  pressao: {
    leituras: number;
    sistolica: ResumoDaMetrica;
    diastolica: ResumoDaMetrica;
    ultima: { systolic: number; diastolic: number; measuredAt: Date } | null;
  };
  ecg: RegistroDeEcg[];
  exercicio: { diasComExercicio: number; registros: number };
  comoSeSentiu: {
    registros: number;
    dor: ResumoDaMetrica;
    humor: ResumoDaMetrica;
    ultimos: Array<{ dia: string; dor: number; humor: number }>;
  };
  consultas: Array<{
    dateTime: Date;
    treatmentType: string;
    status: string;
    mode: string;
  }>;
}

/**
 * Houve **alguma** coisa no período?
 *
 * O Bruno pediu para ser avisado quando não houver informação nenhuma, em vez
 * de relatórios vazios circulando em silêncio. Esta é a pergunta que responde
 * isso — e ela olha **tudo**, não só o relógio: uma consulta feita já é algo
 * a contar.
 */
export function temAlgumDado(mon: DadosDeMonitoramento | null | undefined): boolean {
  if (!mon) return false;
  return (
    mon.temSinais ||
    mon.pressao.leituras > 0 ||
    mon.ecg.length > 0 ||
    mon.exercicio.registros > 0 ||
    mon.comoSeSentiu.registros > 0 ||
    mon.consultas.length > 0
  );
}

export async function getMonitoringData(
  patientId: string,
  opts: { days?: number } = {}
): Promise<DadosDeMonitoramento> {
  const dias = opts.days ?? 30;
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = desde.toISOString().split("T")[0];

  const [pontos, pressao, exercicio, checkins, consultas] = await Promise.all([
    (prisma as any).wearableDataPoint.findMany({
      where: { userId: patientId, dataDate: { gte: desdeStr } },
      orderBy: { dataDate: "asc" },
    }).catch(() => []),
    (prisma as any).bloodPressureReading.findMany({
      where: { patientId, measuredAt: { gte: desde } },
      orderBy: { measuredAt: "asc" },
      select: { systolic: true, diastolic: true, measuredAt: true },
    }).catch(() => []),
    (prisma as any).exerciseCompletionLog.findMany({
      where: { patientId, completedDate: { gte: desde } },
      select: { completedDate: true },
    }).catch(() => []),
    (prisma as any).dailyCheckIn.findMany({
      where: { patientId, checkinDate: { gte: desdeStr } },
      orderBy: { checkinDate: "asc" },
      select: { checkinDate: true, painLevel: true, moodLevel: true },
    }).catch(() => []),
    (prisma as any).appointment.findMany({
      where: { patientId, dateTime: { gte: desde } },
      orderBy: { dateTime: "asc" },
      select: { dateTime: true, treatmentType: true, status: true, mode: true },
    }).catch(() => []),
  ]);

  /**
   * **O balde vem do mapa, não da memória de quem escreve a linha** (119 T-9).
   *
   * Isto dizia `serie("BODY", "restingHr")` — e `BODY` **nunca é escrito** pela
   * ingestão da Withings, que guarda em `SLEEP`, `VITALS` e `ACTIVITY`. O único
   * escritor de `BODY` no repositório é o webhook da Terra, desligado.
   *
   * O resultado: FC de repouso, VFC e SpO2 vazias no relatório de **todos** os
   * pacientes, indistinguíveis de quem nunca mediu. O Bruno viu-o ao pôr o
   * relatório ao lado da aba Saúde, que mostrava os dois números.
   */
  const sinais = {
    sono: resumirSerie(serieDaMetrica(pontos as any[], "sleepDuration")),
    fcRepouso: resumirSerie(serieDaMetrica(pontos as any[], "restingHr")),
    hrv: resumirSerie(serieDaMetrica(pontos as any[], "hrv")),
    spo2: resumirSerie(serieDaMetrica(pontos as any[], "spo2")),
    passos: resumirSerie(serieDaMetrica(pontos as any[], "steps"), "steps"),
  };

  /**
   * **A série diária, ao lado do resumo** (118 T-8).
   *
   * Ela era lida, resumida num número e deitada fora. O papel mostrava *"54
   * bpm"* e não tinha como mostrar **o que mudou** — que é a pergunta que leva
   * alguém a um médico, e o que o app do aparelho desenha.
   *
   * Vai crua: com os buracos onde eles estão. Quem desenha é que decide o que
   * fazer com eles, e a resposta é não os atravessar.
   */
  /**
   * **A pressão, por dia** (118 T-8).
   *
   * Ela não vem do `WearableDataPoint`: vem leitura a leitura do
   * `BloodPressureReading`, com a hora. Para a linha, o dia é a unidade — como
   * em todas as outras — e **um dia com três medições é um ponto, não três**:
   * senão uma manhã em que a pessoa mediu de hora a hora desenharia um pico que
   * é só diligência dela.
   *
   * O dia é em UTC, como o resto deste ficheiro (`periodo`). Para quem mede às
   * 23h num fuso a leste isso cai no dia seguinte — é uma imprecisão conhecida e
   * partilhada por toda a série; corrigi-la aqui sozinha faria a pressão contar
   * dias diferentes das outras métricas.
   */
  const series = {
    sistolica: pressaoPorDia(pressao as any[], "systolic"),
    diastolica: pressaoPorDia(pressao as any[], "diastolic"),
    sono: serieDaMetrica(pontos as any[], "sleepDuration"),
    fcRepouso: serieDaMetrica(pontos as any[], "restingHr"),
    hrv: serieDaMetrica(pontos as any[], "hrv"),
    spo2: serieDaMetrica(pontos as any[], "spo2"),
    passos: serieDaMetrica(pontos as any[], "steps"),
  };

  /**
   * As fases da **última noite com fases**.
   *
   * Sete horas com uma de sono profundo e sete com três são noites diferentes, e
   * o total de minutos não as distingue.
   */
  const noites = (pontos as any[])
    .filter((p) => p.dataType === "SLEEP")
    .sort((a, b) => String(b.dataDate).localeCompare(String(a.dataDate)));
  const comFases = noites.find(
    (n) => [n.deepMinutes, n.lightMinutes, n.remMinutes, n.awakeMinutes].some((v) => typeof v === "number" && v > 0)
  );
  const fasesDoSono = comFases
    ? {
        dia: String(comFases.dataDate),
        profundo: Number(comFases.deepMinutes) || 0,
        leve: Number(comFases.lightMinutes) || 0,
        rem: Number(comFases.remMinutes) || 0,
        acordado: Number(comFases.awakeMinutes) || 0,
      }
    : null;

  /**
   * O ECG é lista, não média.
   *
   * Uma "média de conclusões" não existe: cada registro é um evento, e o que
   * importa é qual deles disse o quê e quando.
   */
  /**
   * **O ECG vem da tabela dele** (achado do code review, 02/10).
   *
   * Isto lia `pontos.map(lerEcg)`, e o `lerEcg` exige `dataType: "ECG"` — um
   * balde que **ninguém escreve** desde que a 119 T-2 mudou o ECG para o
   * `EcgRecording`, uma linha por gravação.
   *
   * Logo `ecg` era sempre `[]`, o `if (mon.ecg.length > 0)` nunca entrava, e a
   * secção de ECG **não saía no relatório de nenhum paciente** — incluindo um a
   * quem o relógio tivesse detectado fibrilhação. O app mostrava as gravações;
   * o papel que vai ao médico, não.
   *
   * É a gaveta vazia outra vez, e com o agravante de eu ter corrigido a mesma
   * coisa ao lado hoje — na rota do painel, com um comentário a explicar
   * exactamente isto — e não ter corrigido aqui.
   */
  const gravacoes = await (prisma as any).ecgRecording
    .findMany({
      where: { userId: patientId, recordedAt: { gte: desde } },
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true, conclusao: true, heartRate: true },
    })
    .catch(() => []);

  const ecg = (gravacoes as any[]).map((g) => ({
    recordedAt: g.recordedAt instanceof Date ? g.recordedAt.toISOString() : String(g.recordedAt),
    conclusao: g.conclusao,
    heartRate: typeof g.heartRate === "number" ? g.heartRate : null,
  })) as RegistroDeEcg[];

  const diasComExercicio = new Set(
    (exercicio as any[]).map((e) => new Date(e.completedDate).toISOString().split("T")[0])
  ).size;

  return {
    periodo: { de: desdeStr, ate: new Date().toISOString().split("T")[0], dias },
    series,
    fasesDoSono,
    sinais,
    // Uma seção de sinais com cinco traços é pior que nenhuma seção.
    temSinais: Object.values(sinais).some((m) => m.dias > 0),
    pressao: {
      leituras: (pressao as any[]).length,
      /**
       * **O resumo sai da mesma série que o gráfico** (achado do code review).
       *
       * Isto entregava ao `resumirSerie` **uma entrada por leitura**, enquanto a
       * linha logo ao lado já usava um ponto por dia. Com três medições numa
       * manhã e uma noutro dia, o papel imprimia:
       *
       * - `135 mmHg · 5 mmHg acima da primeira metade · média dos 4 dias`
       * - e desenhava a linha a **descer** de 140 para 110.
       *
       * Três erros num bloco: o **sinal da variação invertido** — o
       * `resumirSerie` parte ao meio por índice de leitura, e as três da manhã
       * ficam 2 numa metade e 1 na outra —, *"4 dias"* quando foram 2, e o dia
       * diligente a pesar 3× na média.
       *
       * Era exactamente o que o comentário do `pressaoPorDia` diz que não pode
       * acontecer: *"a linha diz que a pressão subiu quando o que subiu foi o
       * cuidado"*. A linha ficou protegida hoje de manhã; o número não.
       *
       * Num papel que vai ao médico, a direcção da pressão é o item em que
       * errar não é aceitável.
       */
      sistolica: resumirSerie(pressaoPorDia(pressao as any[], "systolic")),
      diastolica: resumirSerie(pressaoPorDia(pressao as any[], "diastolic")),
      ultima: (pressao as any[]).length
        ? (pressao as any[])[(pressao as any[]).length - 1]
        : null,
    },
    ecg,
    exercicio: { diasComExercicio, registros: (exercicio as any[]).length },
    comoSeSentiu: {
      registros: (checkins as any[]).length,
      dor: resumirSerie(
        (checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.painLevel }))
      ),
      humor: resumirSerie(
        (checkins as any[]).map((c) => ({ dia: c.checkinDate, valor: c.moodLevel }))
      ),
      ultimos: (checkins as any[])
        .slice(-10)
        .map((c) => ({ dia: c.checkinDate, dor: c.painLevel, humor: c.moodLevel })),
    },
    consultas: consultas as any[],
  };
}
