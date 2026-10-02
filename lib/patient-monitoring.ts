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

  const anterior = ordenados.length >= 4 ? media(ordenados.slice(0, meio)) : null;
  const atual = ordenados.length >= 4 ? media(ordenados.slice(meio)) : media(ordenados);

  const umaCasa = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
  const escrever = (n: number | null) => (campo ? comoSeEscreve(campo, umaCasa(n)) : umaCasa(n));

  return {
    atual: escrever(atual),
    anterior: escrever(anterior),
    variacao:
      atual === null || anterior === null ? null : escrever(atual - anterior),
    dias,
  };
}

export interface DadosDeMonitoramento {
  periodo: { de: string; ate: string; dias: number };
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
   * O ECG é lista, não média.
   *
   * Uma "média de conclusões" não existe: cada registro é um evento, e o que
   * importa é qual deles disse o quê e quando.
   */
  const ecg = (pontos as any[])
    .map((p) => lerEcg(p))
    .filter((r): r is RegistroDeEcg => r !== null)
    .sort((a, b) => String(b.recordedAt).localeCompare(String(a.recordedAt)));

  const diasComExercicio = new Set(
    (exercicio as any[]).map((e) => new Date(e.completedDate).toISOString().split("T")[0])
  ).size;

  return {
    periodo: { de: desdeStr, ate: new Date().toISOString().split("T")[0], dias },
    sinais,
    // Uma seção de sinais com cinco traços é pior que nenhuma seção.
    temSinais: Object.values(sinais).some((m) => m.dias > 0),
    pressao: {
      leituras: (pressao as any[]).length,
      sistolica: resumirSerie(
        (pressao as any[]).map((r) => ({
          dia: new Date(r.measuredAt).toISOString().split("T")[0],
          valor: r.systolic,
        }))
      ),
      diastolica: resumirSerie(
        (pressao as any[]).map((r) => ({
          dia: new Date(r.measuredAt).toISOString().split("T")[0],
          valor: r.diastolic,
        }))
      ),
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
