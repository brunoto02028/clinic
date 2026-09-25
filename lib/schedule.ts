import { prisma } from "@/lib/db";
import { zonedTimeToUtc, getZonedMinutesOfDay } from "@/lib/clinic-timezone";

/**
 * A agenda como a clínica a configurou — e os horários que sobram dela.
 *
 * As regras são **dados**, não código: a clínica monta a semana em janelas, diz
 * para que serve cada uma e quantos cabem, e o app do paciente é o reflexo
 * disso. O que fica aqui, em código, são só os invariantes que não são
 * preferência: duas janelas não se sobrepõem, a capacidade não é estourada, e
 * horário que já passou não aparece.
 *
 * **Fallback, não substituição.** Quem não configurou janela nenhuma continua
 * regido por `TherapistAvailability`, como sempre: uma faixa por dia,
 * capacidade 1. Ninguém acorda sem agenda porque o modelo mudou.
 */

export type WindowKind = "CONSULTATION" | "TREATMENT";

export interface Slot {
  /** "14:00" */
  time: string;
  kind: WindowKind;
  capacity: number;
  taken: number;
  /** `capacity - taken`. Zero significa que o horário não aparece. */
  spacesLeft: number;
}

const minutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
const hhmm = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * O dia da semana de uma data escrita, sem passar pelo relógio do servidor.
 *
 * A primeira correção trocou `toISOString()` por leitura local — e local é o
 * fuso **do servidor**, que em produção é UTC (`node:20-alpine`, sem `ENV TZ`).
 * Resultado: a segunda devolvia as janelas de domingo, a exceção fechava o dia
 * errado, o horário certo era recusado e um fora da janela era aceito. Só
 * aparecia fora de `Europe/London`, então passava batido aqui.
 *
 * Agora a agenda fala em **data escrita** ("YYYY-MM-DD") e hora da clínica, e
 * não lê o relógio do processo em lugar nenhum. O meio-dia UTC é só para o
 * cálculo do dia da semana não encostar em nenhuma borda.
 */
function diaDaSemana(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/** Duas janelas na mesma faixa seriam a mesma sala em dois usos. */
export function overlaps(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  return minutos(a.startTime) < minutos(b.endTime) && minutos(b.startTime) < minutos(a.endTime);
}

export interface ResolvedWindow {
  startTime: string;
  endTime: string;
  kind: WindowKind;
  capacity: number;
  slotMinutes: number;
}

/**
 * As janelas que valem **neste dia**, já com a exceção aplicada.
 *
 * A exceção é o dia que foge da semana: feriado, férias, ou um expediente mais
 * curto. Sem ela a agenda é puramente semanal e repetida, e a primeira vez que
 * a clínica fecha mais cedo alguém marca num horário que não existe.
 */
export async function windowsForDate(
  clinicId: string,
  therapistId: string,
  /** "YYYY-MM-DD" na data da clínica — nunca um `Date`, ver `diaDaSemana`. */
  dateStr: string
): Promise<ResolvedWindow[]> {

  // A do terapeuta vence a da clínica. Não dá para pedir isso ao banco com
  // `orderBy therapistId desc`: no Postgres, DESC é NULLS FIRST, e a linha da
  // clínica (nula) ganhava — um terapeuta de folga aparecia disponível
  // (QA de 25/09, falha 5). Duas linhas no máximo; a escolha é feita aqui.
  const excecoes = await (prisma as any).scheduleException.findMany({
    where: {
      clinicId,
      date: dateStr,
      OR: [{ therapistId }, { therapistId: null }],
    },
  });
  const excecao =
    excecoes.find((e: any) => e.therapistId === therapistId) ??
    excecoes.find((e: any) => e.therapistId === null) ??
    null;

  if (excecao?.closed) return [];

  const janelas = await (prisma as any).scheduleWindow.findMany({
    where: { clinicId, therapistId, dayOfWeek: diaDaSemana(dateStr), isActive: true },
    orderBy: { startTime: "asc" },
    select: { startTime: true, endTime: true, kind: true, capacity: true, slotMinutes: true },
  });

  if (janelas.length === 0) return [];

  // Um expediente encurtado apara as janelas em vez de apagá-las: "hoje só até
  // as 15h" continua sendo a semana normal, mais curta.
  const corte = excecao && !excecao.closed ? excecao : null;
  if (!corte?.startTime && !corte?.endTime) return janelas;

  const inicio = corte.startTime ? minutos(corte.startTime) : -Infinity;
  const fim = corte.endTime ? minutos(corte.endTime) : Infinity;

  return janelas
    .map((j: ResolvedWindow) => ({
      ...j,
      startTime: hhmm(Math.max(minutos(j.startTime), inicio === -Infinity ? minutos(j.startTime) : inicio)),
      endTime: hhmm(Math.min(minutos(j.endTime), fim === Infinity ? minutos(j.endTime) : fim)),
    }))
    .filter((j: ResolvedWindow) => minutos(j.endTime) > minutos(j.startTime));
}

/**
 * Os horários livres do dia, por tipo.
 *
 * `taken` conta quem já está naquele horário. Na consulta a capacidade é 1 e o
 * comportamento é o de sempre — o horário some quando alguém marca. No
 * tratamento ele só some quando **lota**, e até lá o paciente vê quantas vagas
 * restam. Nunca quem está nelas: quem está na sala é assunto da clínica.
 */
export async function slotsForDate(
  clinicId: string,
  therapistId: string,
  dateStr: string,
  opts: { kind?: WindowKind; nowMinutes?: number | null } = {}
): Promise<Slot[]> {
  const janelas = await windowsForDate(clinicId, therapistId, dateStr);
  if (janelas.length === 0) return [];

  // As bordas do dia **da clínica**, convertidas para instante. `setHours` em
  // cima de um `Date` daria a meia-noite do servidor.
  const diaInicio = zonedTimeToUtc(dateStr, "00:00");
  const diaFim = zonedTimeToUtc(dateStr, "23:59");

  // Quem está esperando pagar segura o horário — mas não para sempre. Um
  // Checkout abandonado deixava a vaga presa indefinidamente, e o plano diz o
  // contrário: "o horário só fica reservado depois" do pagamento
  // (QA de 25/09, N8). Meia hora é o tempo de pagar; passou disso, a vaga
  // volta para quem quiser.
  const limiteDeEspera = new Date(Date.now() - 30 * 60 * 1000);

  const marcadas = await prisma.appointment.findMany({
    where: {
      therapistId,
      dateTime: { gte: diaInicio, lte: diaFim },
      OR: [
        { status: { in: ["CONFIRMED", "PENDING_PATIENT"] } },
        { status: "PENDING", createdAt: { gte: limiteDeEspera } },
      ],
    },
    select: { dateTime: true, duration: true },
  });

  const ocupacao = (inicio: number, fim: number) =>
    marcadas.filter((a) => {
      // Minutos no fuso da clínica, como a rota antiga já fazia.
      const aInicio = getZonedMinutesOfDay(a.dateTime);
      const aFim = aInicio + (a.duration || 60);
      return inicio < aFim && aInicio < fim;
    }).length;

  const saida: Slot[] = [];

  for (const j of janelas) {
    if (opts.kind && j.kind !== opts.kind) continue;

    const passo = j.slotMinutes > 0 ? j.slotMinutes : 60;
    for (let t = minutos(j.startTime); t + passo <= minutos(j.endTime); t += passo) {
      // Horário que já começou não é oferta, é armadilha.
      if (opts.nowMinutes != null && t <= opts.nowMinutes) continue;

      const taken = ocupacao(t, t + passo);
      const spacesLeft = j.capacity - taken;
      if (spacesLeft <= 0) continue;

      saida.push({ time: hhmm(t), kind: j.kind, capacity: j.capacity, taken, spacesLeft });
    }
  }

  return saida.sort((a, b) => minutos(a.time) - minutos(b.time));
}

/**
 * Este **dia** foi configurado? Decide entre o modelo novo e o antigo.
 *
 * Contava janelas do terapeuta, não do dia: criar uma janela de sábado apagava
 * a segunda inteira de quem tinha a agenda antiga — em silêncio, e com o aviso
 * da tela sumindo exatamente quando o risco começava (QA de 25/09, N6).
 *
 * Dia a dia, a migração é gradual: o que você configurou passa a valer, o resto
 * continua como estava.
 */
export async function hasConfiguredSchedule(
  clinicId: string,
  therapistId: string,
  dateStr?: string
): Promise<boolean> {
  const n = await (prisma as any).scheduleWindow.count({
    where: {
      clinicId,
      therapistId,
      isActive: true,
      ...(dateStr ? { dayOfWeek: diaDaSemana(dateStr) } : {}),
    },
  });
  return n > 0;
}
