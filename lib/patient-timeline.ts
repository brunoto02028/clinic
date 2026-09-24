import { prisma } from "@/lib/db";
import { getBpThresholds, type BpThresholds } from "@/lib/automation/bp-thresholds";

/**
 * Everything the clinic recorded about one patient, over a period.
 *
 * Not to be confused with `lib/patient-report.ts`, which is older and does a
 * different job: that one renders the clinical report as a print-ready HTML
 * page and is what `/admin/patients/[id]/diagnosis` emails to the patient.
 * This one reads a period and returns data. I overwrote that file with this
 * one and broke both of its buttons; the two now live side by side, which is
 * what they always should have done.
 *
 * Screening, protocol, exercise adherence, daily check-ins, blood pressure,
 * outcome measures, appointments, clinical notes and wearable readings all sit
 * in the same database, already keyed to the patient. This is the single read
 * that puts them on one timeline.
 *
 * It aggregates; it does not interpret. No score is invented, no trend is
 * named, nothing is inferred — a clinical report that reasons on its own is
 * worse than none, because the reader cannot tell which part came from a
 * measurement. Every number here is something a person or a device recorded.
 *
 * It lives in lib/ rather than in the route because two callers need the exact
 * same numbers: the screen and the PDF. T-7 asks for a PDF "identical to the
 * screen", and two queries drift the moment one of them is edited.
 */

export const REPORT_DEFAULT_DAYS = 90;
export const REPORT_MAX_DAYS = 730;

export interface PatientReport {
  patient: any;
  period: { from: string; to: string; days: number };
  thresholds: BpThresholds;
  summary: {
    exerciseDaysLogged: number;
    totalDays: number;
    checkIns: number;
    bloodPressureReadings: number;
    bloodPressureAboveThreshold: number;
    appointments: number;
    clinicalNotes: number;
    wearableDays: number;
  };
  screening: any | null;
  protocols: any[];
  prescriptions: any[];
  completions: any[];
  checkIns: any[];
  bloodPressure: any[];
  outcomes: any[];
  appointments: any[];
  notes: any[];
  wearable: any[];
}

/** Why a requested period cannot be used, in a sentence an API can return. */
export function periodProblem(from: Date, to: Date): string | null {
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return "Invalid date range";
  // Silently swapping them would produce a report for a period nobody asked
  // for, which is worse than refusing.
  if (from > to) return "`from` must be before `to`";
  if ((to.getTime() - from.getTime()) / 86_400_000 > REPORT_MAX_DAYS) {
    return `Range cannot exceed ${REPORT_MAX_DAYS} days`;
  }
  return null;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A date the caller wrote as a day, read as the whole of that day.
 *
 * `new Date("2026-09-23")` is midnight, so asking for a period ending today
 * excluded everything recorded today — QA seeded a 199/111 reading, an
 * appointment and a note this morning and none of them appeared, while the
 * check-in and the wearable day did, because those two are filtered by date
 * string. One report, two answers about what "today" means.
 */
function dayBoundary(value: string, end: boolean): Date {
  if (!DATE_ONLY.test(value)) return new Date(value);
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
}

/** The period a request asked for, defaulting to the last 90 days. */
export function periodFromQuery(url: URL): { from: Date; to: Date } {
  const toParam = url.searchParams.get("to");
  const fromParam = url.searchParams.get("from");
  const to = toParam ? dayBoundary(toParam, true) : new Date();
  const from = fromParam
    ? dayBoundary(fromParam, false)
    : new Date(to.getTime() - REPORT_DEFAULT_DAYS * 24 * 60 * 60 * 1000);
  return { from, to };
}

export async function buildPatientReport(
  patientId: string,
  from: Date,
  to: Date,
  clinicId: string | null
): Promise<PatientReport | null> {
  const period = { gte: from, lte: to };

    const [
      patient,
      screening,
      protocols,
      prescriptions,
      completions,
      checkIns,
      bloodPressure,
      outcomes,
      appointments,
      notes,
      wearable,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          dateOfBirth: true, preferredLocale: true, createdAt: true,
          clinic: { select: { name: true, logoUrl: true } },
        },
      }),
      // The screening is a single document, not a series: the latest one is
      // the patient's, whenever it was filled in, so it is not cut by period.
      // `userId`, não `patientId`: este modelo nomeia a coluna de outro jeito,
      // e a consulta silenciosamente não compila com o nome errado.
      (prisma as any).medicalScreening.findFirst({
        where: { userId: patientId },
        orderBy: { updatedAt: "desc" },
      }),
      (prisma as any).treatmentProtocol.findMany({
        where: { patientId, status: "SENT_TO_PATIENT" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, summary: true, goals: true, precautions: true,
          estimatedWeeks: true, sessionsPerWeek: true, startDate: true, createdAt: true,
          therapist: { select: { firstName: true, lastName: true } },
          items: {
            select: { id: true, title: true, phase: true, sets: true, reps: true, frequency: true, isCompleted: true, completedCount: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      (prisma as any).exercisePrescription.findMany({
        where: { patientId, isActive: true },
        select: {
          id: true, sets: true, reps: true, frequency: true, completedCount: true,
          exercise: { select: { name: true, bodyRegion: true } },
        },
      }),
      // One row per day per item: this is what adherence is actually made of.
      (prisma as any).exerciseCompletionLog.findMany({
        where: { patientId, completedDate: period },
        select: { completedDate: true, exercisePrescriptionId: true, protocolItemId: true },
        orderBy: { completedDate: "asc" },
      }),
      (prisma as any).dailyCheckIn.findMany({
        where: { patientId, checkinDate: { gte: from.toISOString().split("T")[0], lte: to.toISOString().split("T")[0] } },
        orderBy: { checkinDate: "asc" },
      }),
      (prisma as any).bloodPressureReading.findMany({
        where: { patientId, measuredAt: period },
        orderBy: { measuredAt: "asc" },
        select: { id: true, systolic: true, diastolic: true, heartRate: true, method: true, measuredAt: true, recordedById: true, notes: true },
      }),
      (prisma as any).patientOutcomeMeasure.findMany({
        where: { patientId, recordedAt: period },
        orderBy: { recordedAt: "asc" },
      }),
      (prisma as any).appointment.findMany({
        where: { patientId, dateTime: period },
        orderBy: { dateTime: "asc" },
        select: {
          id: true, dateTime: true, treatmentType: true, status: true, duration: true,
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      (prisma as any).sOAPNote.findMany({
        where: { patientId, createdAt: period },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, subjective: true, objective: true, assessment: true, plan: true, createdAt: true,
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      (prisma as any).wearableDataPoint.findMany({
        where: { userId: patientId, dataDate: { gte: from.toISOString().split("T")[0], lte: to.toISOString().split("T")[0] } },
        orderBy: { dataDate: "asc" },
        select: {
          dataDate: true, dataType: true, provider: true,
          sleepDuration: true, deepMinutes: true, remMinutes: true, sleepEfficiency: true,
          hrv: true, restingHr: true, spo2: true,
          steps: true, activeCalories: true, activeMinutes: true,
        },
      }),
    ]);

    if (!patient) return null;

    // Counts, not conclusions. "Twelve of ninety days" is a fact; "adherence is
    // poor" is a judgement, and that one belongs to the therapist reading this.
    const daysWithActivity = new Set(
      completions.map((c: any) => new Date(c.completedDate).toISOString().split("T")[0])
    ).size;
    const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));

    // The clinic's own alert threshold (activity 074, T-3), not 130/80 written
    // here. A clinic that raised its threshold would otherwise read a count of
    // "high" readings that no longer matches the ones it was alerted about.
    const thresholds = await getBpThresholds(clinicId);
    const bpHigh = bloodPressure.filter(
      (r: any) => r.systolic >= thresholds.alertSystolic || r.diastolic >= thresholds.alertDiastolic
    ).length;

    return {
      patient,
      period: { from: from.toISOString(), to: to.toISOString(), days: totalDays },
      // Sent so the screen can name the number it is counting against instead
      // of printing "above threshold" and leaving the reader to guess which.
      thresholds,
      summary: {
        exerciseDaysLogged: daysWithActivity,
        totalDays,
        checkIns: checkIns.length,
        bloodPressureReadings: bloodPressure.length,
        bloodPressureAboveThreshold: bpHigh,
        appointments: appointments.length,
        clinicalNotes: notes.length,
        wearableDays: new Set(wearable.map((w: any) => w.dataDate)).size,
      },
      screening,
      protocols,
      prescriptions,
      completions,
      checkIns,
      bloodPressure,
      outcomes,
      appointments,
      notes,
      wearable,
    };
}
