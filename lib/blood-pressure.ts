// Staff-recorded blood pressure readings on a patient's record (activity 69) —
// a clinician logs it (typically right before a session, for older/at-risk
// patients) instead of the patient self-measuring in their own app. Shares
// the same BloodPressureReading model/table as patient self-entry
// (app/api/patient/blood-pressure); recordedById is what tells the two apart.

export type BPClassification = "LOW" | "NORMAL" | "ELEVATED" | "STAGE1" | "STAGE2" | "CRISIS";

/** NHS/ACC-AHA-style bands, same thresholds already used by the patient-facing pages. */
export function classifyBP(systolic: number, diastolic: number): BPClassification {
  if (systolic >= 180 || diastolic >= 120) return "CRISIS";
  if (systolic >= 140 || diastolic >= 90) return "STAGE2";
  if (systolic >= 130 || diastolic >= 80) return "STAGE1";
  if (systolic >= 120 && diastolic < 80) return "ELEVATED";
  if (systolic < 90 || diastolic < 60) return "LOW";
  return "NORMAL";
}

export type BPInput = {
  systolic?: number;
  diastolic?: number;
  heartRate?: number | null;
  notes?: string | null;
  measuredAt?: Date;
};

type Parsed = { ok: true; data: BPInput } | { ok: false; error: string };

// Whole numbers only — mmHg/bpm are never fractional on a manual cuff reading.
function int(body: any, key: string, min: number, max: number): { v?: number | null; err?: string } {
  if (!(key in body) || body[key] === undefined) return {};
  const raw = body[key];
  if (raw === null || (typeof raw === "string" && raw.trim() === "")) return { v: null };
  if (typeof raw !== "number" && !(typeof raw === "string" && /^\d+$/.test(raw.trim()))) {
    return { err: `${key} must be a whole number` };
  }
  const n = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isInteger(n)) return { err: `${key} must be a whole number` };
  if (n < min || n > max) return { err: `${key} must be between ${min} and ${max}` };
  return { v: n };
}

/**
 * Validates a create (partial=false: systolic+diastolic required) or an edit
 * (partial=true: only the fields sent are touched).
 */
export function parseBPBody(body: any, partial: boolean): Parsed {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const data: BPInput = {};

  const sys = int(body, "systolic", 50, 300);
  if (sys.err) return { ok: false, error: sys.err };
  if (sys.v !== undefined) {
    if (sys.v === null) return { ok: false, error: "systolic cannot be cleared" };
    data.systolic = sys.v;
  }
  const dia = int(body, "diastolic", 30, 200);
  if (dia.err) return { ok: false, error: dia.err };
  if (dia.v !== undefined) {
    if (dia.v === null) return { ok: false, error: "diastolic cannot be cleared" };
    data.diastolic = dia.v;
  }
  if (!partial && (data.systolic === undefined || data.diastolic === undefined)) {
    return { ok: false, error: "systolic and diastolic are required" };
  }

  const hr = int(body, "heartRate", 30, 220);
  if (hr.err) return { ok: false, error: hr.err };
  if (hr.v !== undefined) data.heartRate = hr.v;

  // On a create both values are always present here, so this already catches
  // it. On an edit that only touches one of the two, the caller re-checks
  // after merging with the existing row (see checkBPOrder below).
  if (!partial && data.diastolic! >= data.systolic!) {
    return { ok: false, error: "diastolic must be lower than systolic" };
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && (typeof body.notes !== "string" || body.notes.length > 2000)) {
      return { ok: false, error: "notes must be text up to 2000 characters" };
    }
    data.notes = body.notes ? body.notes.trim() || null : null;
  }

  if (body.measuredAt !== undefined && body.measuredAt !== null && body.measuredAt !== "") {
    const d = typeof body.measuredAt === "string" ? new Date(body.measuredAt) : new Date(NaN);
    const DAY_MS = 24 * 60 * 60 * 1000;
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2000) return { ok: false, error: "measuredAt is not a valid date" };
    if (d.getTime() > Date.now() + DAY_MS) return { ok: false, error: "measuredAt cannot be in the future" };
    data.measuredAt = d;
  }

  return { ok: true, data };
}

/** Re-checked by PATCH after merging with the existing row (a partial edit may
 * only send one of the two values). */
export function checkBPOrder(systolic: number, diastolic: number): string | null {
  return diastolic >= systolic ? "diastolic must be lower than systolic" : null;
}
