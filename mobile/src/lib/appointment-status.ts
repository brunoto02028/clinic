/**
 * Só as cores que este módulo usa, e não o tema inteiro.
 *
 * O tipo vinha de `useTheme`, e com ele vinha a árvore inteira do tema — loja
 * de estado, contexto, o `@/` do aplicativo. Para escolher entre oito cores
 * isso é caro: qualquer teste que quisesse medir o **rótulo** tinha de montar
 * o tema de verdade. O tema real continua servindo aqui; ele tem estas cores.
 */
export interface CoresDoStatus {
  colors: {
    warnSoft: string;
    warn: string;
    okSoft: string;
    ok: string;
    surfaceMuted: string;
    textMuted: string;
    badSoft: string;
    bad: string;
  };
}
import { t as tr, type Lang } from "./i18n";

/**
 * One map for AppointmentStatus, because two drifted.
 *
 * The list screen and the detail screen each carried their own copy. Both had
 * a `SCHEDULED` entry — not a member of the enum — and neither had `PENDING`,
 * so an unconfirmed appointment fell through to the invented entry and told
 * the patient it was booked. Fixing the list alone left the detail screen
 * saying "Agendado" about the very appointment the list called "Pendente".
 *
 * The enum is PENDING, PENDING_PATIENT, CONFIRMED, COMPLETED, CANCELLED,
 * NO_SHOW (prisma/schema.prisma). Every member is present here; add to this
 * map, not to a screen.
 *
 * The labels were Portuguese-only, so an en-GB patient read "Pendente" and
 * "Concluído" on an otherwise English screen — the one place the language of a
 * whole list was decided by a shared helper rather than by the screen.
 */
/**
 * A folga depois do fim, igual à do servidor (`lib/video-call.ts`).
 *
 * Está repetida porque o aplicativo não importa do `lib/` da web, e não é
 * inventável: um número diferente aqui faria o app chamar de vencida uma
 * consulta que o painel ainda considera em curso. Um teste compara os dois.
 */
export const FOLGA_DEPOIS_MIN = 30;

/**
 * Os status que ainda esperam desfecho — os mesmos que a fila do painel busca
 * (`app/api/admin/appointments/pending-outcome/route.ts`).
 */
export const STATUS_ABERTOS = ["PENDING", "PENDING_PATIENT", "CONFIRMED"] as const;

/**
 * A consulta passou e ninguém fechou.
 *
 * Vence no **fim da janela**, não no horário: horário + duração + a folga. Antes
 * disso ela ainda pode estar acontecendo.
 */
export function venceuSemDesfecho(
  status: string | null | undefined,
  dateTime: string | Date | null | undefined,
  duracaoMin: number | null | undefined,
  agora: number = Date.now()
): boolean {
  if (!status || !STATUS_ABERTOS.includes(status as (typeof STATUS_ABERTOS)[number])) return false;
  const inicio = dateTime ? new Date(dateTime).getTime() : NaN;
  if (!Number.isFinite(inicio)) return false;
  const duracao = Number.isFinite(duracaoMin as number) && (duracaoMin as number) > 0 ? (duracaoMin as number) : 60;
  return agora > inicio + (duracao + FOLGA_DEPOIS_MIN) * 60_000;
}

export interface StatusStyle {
  bg: string;
  text: string;
  label: string;
  icon: string;
}

export function getStatusStyles(
  t: CoresDoStatus,
  lang: Lang = "en"
): Record<string, StatusStyle> {
  return {
    PENDING: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Pending", pt: "Pendente" }), icon: "time-outline" },
    PENDING_PATIENT: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Waiting for you", pt: "Aguardando você" }), icon: "time-outline" },
    CONFIRMED: { bg: t.colors.okSoft, text: t.colors.ok, label: tr(lang, { en: "Confirmed", pt: "Confirmado" }), icon: "checkmark-circle-outline" },
    COMPLETED: { bg: t.colors.surfaceMuted, text: t.colors.textMuted, label: tr(lang, { en: "Completed", pt: "Concluído" }), icon: "checkbox-outline" },
    CANCELLED: { bg: t.colors.badSoft, text: t.colors.bad, label: tr(lang, { en: "Cancelled", pt: "Cancelado" }), icon: "close-circle-outline" },
    NO_SHOW: { bg: t.colors.warnSoft, text: t.colors.warn, label: tr(lang, { en: "Did not attend", pt: "Faltou" }), icon: "alert-circle-outline" },
  };
}

/**
 * Falls back to PENDING — the honest answer for a status we do not know is
 * "not confirmed", never "booked".
 *
 * ## O que passou e ninguém fechou (103 T-3)
 *
 * Ninguém fecha o que vence, então `CONFIRMED` sobrevive à consulta e o app
 * repetia fielmente: *"Confirmada"*, sobre uma consulta de três dias atrás.
 *
 * O app **não** decide que faltou — ninguém decidiu, e chamar de falta o que
 * pode ter sido remarcado por telefone seria pior que o erro anterior. O estado
 * honesto é um terceiro: *aguardando a clínica*. Tom neutro de propósito: nem
 * verde de confirmado, nem vermelho de falta.
 *
 * `quando` é opcional para que nenhuma chamada antiga quebre; quem passar a
 * consulta ganha o rótulo certo.
 */
export function statusStyle(
  t: CoresDoStatus,
  status: string | null | undefined,
  lang: Lang = "en",
  quando?: { dateTime?: string | Date | null; duration?: number | null; agora?: number }
): StatusStyle {
  const map = getStatusStyles(t, lang);
  if (quando && venceuSemDesfecho(status, quando.dateTime, quando.duration, quando.agora)) {
    return {
      bg: t.colors.surfaceMuted,
      text: t.colors.textMuted,
      label: tr(lang, { en: "Awaiting the clinic", pt: "Aguardando a clínica" }),
      icon: "hourglass-outline",
    };
  }
  return map[status ?? ""] ?? map.PENDING;
}
