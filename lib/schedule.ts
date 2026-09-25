import { prisma } from "@/lib/db";

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
 * "YYYY-MM-DD" do **dia local**, e não do UTC.
 *
 * `toISOString().slice(0,10)` numa meia-noite de Londres no horário de verão é
 * 23:00 UTC do dia anterior — e a exceção fechava o dia errado. A janela saía
 * certa porque `getDay()` já lê a hora local; só a data estava deslocada, e o
 * defeito some sozinho no inverno, que é o pior tipo (QA de 25/09, falha 3).
 */
const diaLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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
  date: Date
): Promise<ResolvedWindow[]> {
  const dateStr = diaLocal(date);

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
    where: { clinicId, therapistId, dayOfWeek: date.getDay(), isActive: true },
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
  date: Date,
  opts: { kind?: WindowKind; nowMinutes?: number | null } = {}
): Promise<Slot[]> {
  const janelas = await windowsForDate(clinicId, therapistId, date);
  if (janelas.length === 0) return [];

  const diaInicio = new Date(date);
  diaInicio.setHours(0, 0, 0, 0);
  const diaFim = new Date(date);
  diaFim.setHours(23, 59, 59, 999);

  const marcadas = await prisma.appointment.findMany({
    where: {
      therapistId,
      dateTime: { gte: diaInicio, lte: diaFim },
      status: { in: ["PENDING", "PENDING_PATIENT", "CONFIRMED"] },
    },
    select: { dateTime: true, duration: true },
  });

  const ocupacao = (inicio: number, fim: number) =>
    marcadas.filter((a) => {
      const aInicio = a.dateTime.getHours() * 60 + a.dateTime.getMinutes();
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

/** A clínica configurou alguma janela? Decide entre o modelo novo e o antigo. */
export async function hasConfiguredSchedule(clinicId: string, therapistId: string): Promise<boolean> {
  const n = await (prisma as any).scheduleWindow.count({
    where: { clinicId, therapistId, isActive: true },
  });
  return n > 0;
}
