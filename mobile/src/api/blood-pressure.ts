import { apiFetch } from "./client";

/**
 * The patient's own blood-pressure readings.
 *
 * All of this existed on the server and on the web — the model, the route, the
 * clinician's view, even a reminder cron — and the app had no screen for it.
 * A patient who uses the app rather than the browser simply could not record a
 * reading, which is the one number this clinic wants a daily series of.
 */
export type BloodPressureMethod = "MANUAL" | "CAMERA_PPG" | "CLINIC_DEVICE";
export type BloodPressureSource = "PATIENT_DEVICE" | "CLINIC_DEVICE" | "MANUAL";
export type MeasurementContext = "PRE_SESSION" | "POST_SESSION" | "HOME" | "OTHER";

export interface BloodPressureReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  method: BloodPressureMethod;
  notes: string | null;
  measuredAt: string;
  /** Set when a clinician logged it; null means the patient measured it. */
  recordedById: string | null;
  /** Where it came from and what it was for (activity 074, T-14). */
  source?: BloodPressureSource | null;
  context?: MeasurementContext | null;
}

/** No catch: an empty list means no readings, never a failed request. */
export async function fetchBloodPressure(days = 30): Promise<BloodPressureReading[]> {
  const res = await apiFetch<{ readings: BloodPressureReading[] }>(
    `/api/patient/blood-pressure?days=${days}`
  );
  return Array.isArray(res?.readings) ? res.readings : [];
}

export async function saveBloodPressure(input: {
  systolic: number;
  diastolic: number;
  heartRate?: number | null;
  notes?: string | null;
}): Promise<BloodPressureReading> {
  const res = await apiFetch<{ reading: BloodPressureReading }>("/api/patient/blood-pressure", {
    method: "POST",
    body: JSON.stringify({ ...input, method: "MANUAL" }),
  });
  return res.reading;
}

/**
 * The band a reading falls in, on the same thresholds the server alerts on
 * (`app/api/patient/blood-pressure/route.ts`): ≥180/120 crisis, ≥140/90 stage
 * 2, ≥130/80 stage 1. Kept in step with that route deliberately — a screen
 * that called a reading normal while the server e-mailed an alert about it
 * would be worse than showing nothing.
 */
export type BpBand = "low" | "normal" | "elevated" | "stage1" | "stage2" | "crisis";

/**
 * As mesmas faixas que `lib/blood-pressure.ts` aplica na web — e agora
 * **inteiras**.
 *
 * Faltava `low`. Uma leitura de 85/55 caía no `return "normal"` do fim e
 * aparecia com selo verde, dizendo ao paciente que estava tudo bem, enquanto a
 * web classificava a mesma medição como hipotensão. Num paciente
 * pós-operatório tomando anti-hipertensivo, pressão baixa é risco de queda —
 * e a queda é o que a reabilitação existe para evitar. Achado na revisão de
 * UX de 24/09/2026.
 *
 * A ordem importa: a crise é testada primeiro porque é a única faixa em que o
 * paciente precisa agir agora, e `low` por último entre as anormais porque
 * exige que nenhuma das altas tenha casado.
 */
export function bpBand(systolic: number, diastolic: number): BpBand {
  if (systolic >= 180 || diastolic >= 120) return "crisis";
  if (systolic >= 140 || diastolic >= 90) return "stage2";
  if (systolic >= 130 || diastolic >= 80) return "stage1";
  if (systolic >= 120 && diastolic < 80) return "elevated";
  if (systolic < 90 || diastolic < 60) return "low";
  return "normal";
}

/** Se esta faixa pede ação imediata do paciente, não só registro. */
export function bpNeedsAttentionNow(band: BpBand): boolean {
  return band === "crisis";
}
