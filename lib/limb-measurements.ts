// Post-operative limb measurements (activity 67): input validation and the
// protocol-week lookup shared by the POST and PATCH routes.

import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SIDES = ["LEFT", "RIGHT"] as const;
export const ROM_MODES = ["ACTIVE", "PASSIVE"] as const;

// Three fixed distances above the patellar base — the clinic's standard
// protocol — each with a left and right girth. Adding a fourth point later is
// just another pair here plus a POINTS entry; nothing else needs to change.
export const POINTS = [5, 10, 15] as const;
const GIRTH_FIELDS = POINTS.flatMap((d) => [`thigh${d}LeftCm`, `thigh${d}RightCm`]) as string[];

export type MeasurementInput = {
  operatedSide?: string;
  measuredAt?: Date;
  thigh5LeftCm?: number | null;
  thigh5RightCm?: number | null;
  thigh10LeftCm?: number | null;
  thigh10RightCm?: number | null;
  thigh15LeftCm?: number | null;
  thigh15RightCm?: number | null;
  romMode?: string | null;
  flexionDeg?: number | null;
  extensionDeg?: number | null;
  notes?: string | null;
};

type Parsed = { ok: true; data: MeasurementInput } | { ok: false; error: string };

// undefined = field not sent, null/"" = cleared, otherwise a finite number in range.
function num(body: any, key: string, min: number, max: number, integer = false): { v?: number | null; err?: string } {
  if (!(key in body) || body[key] === undefined) return {};
  const raw = body[key];
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) return { v: null };
  // Only numbers and plain decimal strings: Number([]) / Number(" ") / Number("0x10") would slip through as numbers.
  if (typeof raw !== "number" && !(typeof raw === "string" && /^-?\d+([.,]\d+)?$/.test(raw.trim()))) {
    return { err: `${key} must be a number` };
  }
  const n = typeof raw === "number" ? raw : Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n)) return { err: `${key} must be a number` };
  if (integer && !Number.isInteger(n)) return { err: `${key} must be a whole number` };
  if (n < min || n > max) return { err: `${key} must be between ${min} and ${max}` };
  return { v: n };
}

/**
 * Validates a create (partial=false: operatedSide required) or an edit
 * (partial=true: only the fields sent are touched). Girths are cm, angles are
 * degrees (extension negative = deficit).
 */
export function parseMeasurementBody(body: any, partial: boolean): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const data: MeasurementInput = {};

  if (body.operatedSide !== undefined || !partial) {
    if (!SIDES.includes(body.operatedSide)) return { ok: false, error: "operatedSide must be LEFT or RIGHT" };
    data.operatedSide = body.operatedSide;
  }

  for (const k of GIRTH_FIELDS) {
    const r = num(body, k, 10, 120);
    if (r.err) return { ok: false, error: r.err };
    if (r.v !== undefined) (data as any)[k] = r.v;
  }
  const flex = num(body, "flexionDeg", 0, 180, true);
  if (flex.err) return { ok: false, error: flex.err };
  if (flex.v !== undefined) data.flexionDeg = flex.v;
  const ext = num(body, "extensionDeg", -40, 30, true);
  if (ext.err) return { ok: false, error: ext.err };
  if (ext.v !== undefined) data.extensionDeg = ext.v;

  if (body.romMode !== undefined) {
    if (body.romMode !== null && body.romMode !== "" && !ROM_MODES.includes(body.romMode)) {
      return { ok: false, error: "romMode must be ACTIVE or PASSIVE" };
    }
    data.romMode = body.romMode || null;
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000)) {
      return { ok: false, error: "notes must be text up to 2000 characters" };
    }
    data.notes = body.notes ? body.notes.trim() || null : null;
  }

  if (body.measuredAt !== undefined && body.measuredAt !== null && body.measuredAt !== "") {
    const d = typeof body.measuredAt === "string" ? new Date(body.measuredAt) : new Date(NaN);
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000) return { ok: false, error: "measuredAt is not a valid date" };
    // A day of slack so a same-day entry in an earlier timezone is not rejected.
    if (d.getTime() > Date.now() + DAY_MS) return { ok: false, error: "measuredAt cannot be in the future" };
    data.measuredAt = d;
  }

  if (!partial && !hasMeasurement(data)) {
    return { ok: false, error: "Enter at least one thigh measurement or knee angle" };
  }
  return { ok: true, data };
}

/** True when at least one girth or knee angle is set (a record with none is meaningless). */
export function hasMeasurement(values: Partial<Record<string, unknown>>): boolean {
  return [...GIRTH_FIELDS, "flexionDeg", "extensionDeg"].some((k) => values[k] != null);
}

/**
 * Protocol week of a date, by whole calendar days (UTC) since the protocol's
 * start day: a baseline logged on the day a protocol was assigned (its start
 * date carries a time of day, measurements are stamped at noon) is still week 1.
 * Null when the date is before the start day.
 */
export function protocolWeekOf(start: Date, when: Date): number | null {
  const day = (d: Date) => Math.floor(d.getTime() / DAY_MS);
  const days = day(when) - day(start);
  return days >= 0 ? Math.floor(days / 7) + 1 : null;
}

/**
 * The patient's active protocol — the newest one actually sent to the patient
 * (a DRAFT with a pre-filled schedule is not active) that has a start date —
 * and the week a date falls in.
 */
export async function resolveProtocolWeek(patientId: string, when: Date): Promise<{ protocolId: string | null; protocolWeek: number | null }> {
  const protocol = await prisma.treatmentProtocol.findFirst({
    where: { patientId, status: "SENT_TO_PATIENT", startDate: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, startDate: true },
  });
  if (!protocol?.startDate) return { protocolId: null, protocolWeek: null };
  return { protocolId: protocol.id, protocolWeek: protocolWeekOf(protocol.startDate, when) };
}
