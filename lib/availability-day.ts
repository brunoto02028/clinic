import { prisma } from "@/lib/db";
import { slotsForDate, hasConfiguredSchedule, exceptionForDate, applyException } from "@/lib/schedule";
import { getZonedDateString, getZonedMinutesOfDay, zonedTimeToUtc } from "@/lib/clinic-timezone";

/**
 * A disponibilidade de **um** dia (087, T-2).
 *
 * Isto morava dentro de `app/api/availability/route.ts` e saiu de lá inteiro,
 * sem uma vírgula de regra alterada. O motivo é o calendário: a tela precisa
 * saber quais dias têm vaga **antes** de a pessoa tocar em cada um, e perguntar
 * isso hoje custaria catorze chamadas para uma tira de duas semanas, trinta e
 * uma para um mês.
 *
 * **A regra é escrita uma vez.** Ela é densa — bloqueio de terapeuta, agenda
 * configurada, exceção do dia, modelo antigo como alternativa, horário já
 * ocupado, horário que já passou hoje — e cada um desses pedaços foi um defeito
 * consertado em algum momento. Duplicá-la no modo intervalo criaria duas
 * verdades, e a segunda seria a que ninguém lembra de corrigir.
 */

export interface DiaDisponivel {
  slots: string[];
  detailedSlots?: unknown[];
  available: boolean;
  reason?: string;
  therapistId?: string;
  configured?: boolean;
  workingHours?: { start: string; end: string };
}

export interface OpcoesDoDia {
  /** "CONSULTATION" | "TREATMENT" — só vale no ramo de agenda configurada. */
  kind?: string | null;
  /** Duração em minutos; só o modelo antigo a usa para montar a grade. */
  duration?: number;
}

export async function disponibilidadeDoDia(
  clinicId: string,
  therapistId: string,
  dateStr: string,
  opts: OpcoesDoDia = {}
): Promise<DiaDisponivel> {
  const duration = opts.duration ?? 60;

  // Ancorado ao meio-dia UTC para a data do calendário não depender do fuso do
  // servidor.
  const dayOfWeek = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay();

  // A meia-noite da clínica, não a do servidor.
  const dayStart = zonedTimeToUtc(dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  // Dia bloqueado (feriado, ausência, formação) vence a agenda semanal.
  const block = await (prisma as any).therapistBlock.findFirst({
    where: {
      therapistId,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });
  if (block) {
    return { slots: [], available: false, reason: "blocked" };
  }

  // A agenda configurada pela clínica manda. Quem ainda não configurou janela
  // nenhuma continua regido pelo modelo antigo, logo abaixo — é alternativa,
  // não substituição: ninguém acorda sem agenda porque o modelo mudou
  // (atividade 080, T-5).
  if (await hasConfiguredSchedule(clinicId, therapistId, dateStr)) {
    const kind =
      opts.kind === "CONSULTATION" || opts.kind === "TREATMENT" ? opts.kind : undefined;

    // A data **escrita**, como veio da tela. Passar um `Date` fazia a agenda
    // ler o fuso do servidor, que em produção é UTC (QA de 25/09, N1).
    const slots = await slotsForDate(clinicId, therapistId, dateStr, {
      kind,
      nowMinutes: dateStr === getZonedDateString() ? getZonedMinutesOfDay() : null,
    });

    return {
      // A tela antiga espera uma lista de horas; a nova quer a capacidade
      // junto. Os dois formatos saem daqui para nenhum cliente quebrar.
      slots: slots.map((s: any) => s.time),
      detailedSlots: slots,
      available: slots.length > 0,
      therapistId,
      configured: true,
    };
  }

  const availability = await prisma.therapistAvailability.findUnique({
    where: { therapistId_dayOfWeek: { therapistId, dayOfWeek } },
  });

  if (!availability || !availability.isAvailable) {
    return { slots: [], available: false, reason: "not_working" };
  }

  // O feriado, a folga e o expediente curto valem **em qualquer modelo de
  // agenda**. Eram lidos só no ramo novo, e num dia regido por este aqui a
  // exceção era salva, aparecia na lista, e não fechava nada — dava para
  // marcar no feriado (QA de 25/09, N10).
  const excecaoDoDia = await exceptionForDate(clinicId, therapistId, dateStr);
  const faixa = applyException(
    { startTime: availability.startTime, endTime: availability.endTime },
    excecaoDoDia
  );
  if (!faixa) {
    return {
      slots: [],
      available: false,
      reason: excecaoDoDia?.closed ? "closed" : "not_working",
    };
  }

  const [startH, startM] = faixa.startTime.split(":").map(Number);
  const [endH, endM] = faixa.endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const intervalConfig = await prisma.systemConfig.findUnique({
    where: { key: "SLOT_INTERVAL_MINUTES" },
  });
  const slotInterval = intervalConfig ? parseInt(intervalConfig.value, 10) : 30;
  const allSlots: string[] = [];

  for (let m = startMinutes; m + duration <= endMinutes; m += slotInterval) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    allSlots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
  }

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      therapistId,
      dateTime: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { dateTime: true, duration: true },
  });

  const occupiedRanges = existingAppointments.map((a) => {
    const apptStart = getZonedMinutesOfDay(a.dateTime);
    const apptEnd = apptStart + (a.duration || 60);
    return { start: apptStart, end: apptEnd };
  });

  // Se a data pedida é hoje (no fuso da própria clínica), horários que já
  // começaram saem — senão o paciente "marca" uma consulta que já passou.
  const isToday = dateStr === getZonedDateString();
  const nowMinutes = getZonedMinutesOfDay();

  const availableSlots = allSlots.filter((slot) => {
    const [sh, sm] = slot.split(":").map(Number);
    const slotStart = sh * 60 + sm;
    const slotEnd = slotStart + duration;

    if (isToday && slotStart <= nowMinutes) return false;

    return !occupiedRanges.some((range) => slotStart < range.end && slotEnd > range.start);
  });

  return {
    slots: availableSlots,
    available: true,
    workingHours: { start: availability.startTime, end: availability.endTime },
    therapistId,
  };
}

// ---------------------------------------------------------------------------
// O intervalo
// ---------------------------------------------------------------------------

/**
 * Seis semanas. Um mês com folga nas bordas, que é o que uma grade mensal
 * mostra — e um teto, porque sem ele alguém pede um ano e a rota calcula 365
 * dias de agenda para pintar bolinhas que ninguém vai ver.
 */
export const MAX_DIAS_NO_INTERVALO = 42;

export interface DiaDoIntervalo {
  data: string;
  livres: number;
  fechado: boolean;
  motivo?: string;
}

const FORMA_DE_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function diasEntre(from: string, to: string): string[] | null {
  if (!FORMA_DE_DATA.test(from) || !FORMA_DE_DATA.test(to)) return null;
  // Meio-dia UTC de novo: somar 24h a partir da meia-noite atravessa o horário
  // de verão e pula ou repete um dia.
  const inicio = new Date(`${from}T12:00:00.000Z`);
  const fim = new Date(`${to}T12:00:00.000Z`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return null;
  if (fim < inicio) return null;

  const dias: string[] = [];
  for (let d = new Date(inicio); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
    if (dias.length > MAX_DIAS_NO_INTERVALO) return null;
  }
  return dias;
}

export async function disponibilidadeDoIntervalo(
  clinicId: string,
  therapistId: string,
  dias: string[],
  opts: OpcoesDoDia = {}
): Promise<DiaDoIntervalo[]> {
  // Em paralelo, e não em série: sete dias em série são sete idas ao banco uma
  // atrás da outra, e a pessoa fica olhando a semana carregar.
  const resultados = await Promise.all(
    dias.map(async (data) => {
      const dia = await disponibilidadeDoDia(clinicId, therapistId, data, opts);
      return {
        data,
        livres: dia.slots.length,
        fechado: !dia.available,
        ...(dia.reason ? { motivo: dia.reason } : {}),
      };
    })
  );
  return resultados;
}
