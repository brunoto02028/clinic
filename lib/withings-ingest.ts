import { prisma } from "@/lib/db";
import {
  withingsAccessToken,
  withingsBloodPressure,
  withingsActivity,
  withingsSleep,
  type WithingsBpReading,
} from "@/lib/withings";

/**
 * Writing Withings data into the models that already hold it.
 *
 * One place, because there are now two ways in: the scheduled sync the patient
 * or a cron triggers, and the webhook (T-9), which arrives seconds after a
 * measurement. Both must produce exactly the same rows — including the
 * deduplication — or the same reading lands twice with two different stories
 * about where it came from.
 *
 * Blood pressure does not go to WearableDataPoint: `BloodPressureReading` is
 * where the web, the clinician's view and the app all read it from, and a
 * reading is a reading whether a cuff or a person typed it.
 */

export interface WithingsConnection {
  id: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  /** A cuff owned by the clinic, measuring many patients (T-14). */
  isClinicDevice?: boolean;
  clinicId?: string | null;
}

/**
 * Stores the readings that are not already stored, and says how many were new.
 *
 * Deduplication is on Withings' own `grpid` when we have it, with the old
 * timestamp match kept for readings saved before T-9 added the column — those
 * have no id and would otherwise all come back as new on the next sync.
 */
export async function saveBloodPressure(
  patientId: string,
  clinicId: string | null,
  readings: WithingsBpReading[]
): Promise<number> {
  let saved = 0;
  for (const r of readings) {
    // Two ways a reading can already be here, and they are not interchangeable:
    // its own id, or — for rows saved before T-9 added the column — the same
    // timestamp *with no id*. Matching any row by timestamp would make a
    // reading the patient typed at the same minute swallow the device's.
    const exists = await (prisma as any).bloodPressureReading.findFirst({
      where: {
        patientId,
        OR: [
          ...(r.measureId ? [{ withingsMeasureId: r.measureId }] : []),
          { measuredAt: r.measuredAt, withingsMeasureId: null },
        ],
      },
      select: { id: true, withingsMeasureId: true },
    });
    if (exists) {
      // A row saved before this column existed gets its id filled in, so the
      // fallback match is needed once per reading and never again.
      if (!exists.withingsMeasureId && r.measureId) {
        await (prisma as any).bloodPressureReading.update({
          where: { id: exists.id },
          data: { withingsMeasureId: r.measureId },
        });
      }
      continue;
    }
    try {
      await (prisma as any).bloodPressureReading.create({
      data: {
        patientId,
        clinicId,
        systolic: r.systolic,
        diastolic: r.diastolic,
        heartRate: r.heartRate,
        method: "MANUAL",
        // The patient's own device, not something anyone typed (T-14, passo 7).
        // Without this the history showed a Withings reading from home as
        // "entered by hand", which is simply not what happened.
        source: "PATIENT_DEVICE",
        context: "HOME",
        measuredAt: r.measuredAt,
        notes: "Withings",
        withingsMeasureId: r.measureId,
      },
      });
    } catch (e: any) {
      // Webhook and scheduled sync can deliver the same measurement at the
      // same instant; the unique index catches the loser. A duplicate, not a
      // failure — and it must not abort the rest of the batch.
      if (e?.code === "P2002") continue;
      throw e;
    }
    saved++;

    // A reading that arrives while nobody is looking still has to reach the
    // clinic if it crosses a threshold. This path — the webhook and the
    // scheduled sync — alerted no one until now.
    const { afterBloodPressureRecorded } = await import("@/lib/bp-alerts");
    await afterBloodPressureRecorded({
      patientId,
      clinicId,
      systolic: r.systolic,
      diastolic: r.diastolic,
      measuredAt: r.measuredAt,
      via: "device",
    }).catch((e) => console.error("[withings-ingest] alert failed:", e?.message));
  }
  return saved;
}

async function upsertPoint(
  userId: string,
  connectionId: string,
  dataType: string,
  dataDate: string,
  fields: Record<string, unknown>
) {
  const existing = await (prisma as any).wearableDataPoint.findFirst({
    where: { userId, connectionId, dataDate, dataType },
    select: { id: true },
  });
  if (existing) {
    await (prisma as any).wearableDataPoint.update({ where: { id: existing.id }, data: fields });
  } else {
    await (prisma as any).wearableDataPoint.create({
      data: { userId, connectionId, dataDate, dataType, provider: "WITHINGS", ...fields },
    });
  }
}

/** Thirty days is what the patient's own screens show. */
export const WINDOW_DAYS = 30;

/**
 * A full pull: blood pressure, activity and sleep since `since`.
 *
 * `until` exists for the webhook, which is told the exact window a measurement
 * falls in and has no reason to re-read a month of history to find it.
 */
/**
 * O instante mais recente entre tudo que a Withings devolveu na janela.
 *
 * Vale a leitura que o aparelho da clínica mandou para a caixa de não
 * atribuídas: ela **é** dado chegando. Contá-la só quando cai num paciente
 * fazia a mesma tela listar as leituras e dizer "nada chega deste aparelho há
 * N dias" — uma contradição dentro de um cartão só.
 */
function newestMoment(
  bp: Array<{ measuredAt: Date | string }>,
  activity: Array<{ dataDate: Date | string }>,
  sleep: Array<{ dataDate: Date | string }>
): Date | null {
  let melhor: number | null = null;
  const considerar = (v: Date | string | undefined | null) => {
    if (!v) return;
    const t = (v instanceof Date ? v : new Date(v)).getTime();
    if (!Number.isNaN(t) && (melhor === null || t > melhor)) melhor = t;
  };
  for (const r of bp) considerar(r.measuredAt);
  for (const a of activity) considerar(a.dataDate);
  for (const n of sleep) considerar(n.dataDate);
  return melhor === null ? null : new Date(melhor);
}

export async function ingestWithings(
  userId: string,
  connection: WithingsConnection,
  opts: { since?: Date; until?: Date; kinds?: Array<"bp" | "activity" | "sleep" | "vitals"> } = {}
): Promise<{ bloodPressure: number; activityDays: number; sleepNights: number; vitalsDays: number; ecgRecords: number }> {
  const token = await withingsAccessToken(connection);
  const since = opts.since ?? new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const kinds = opts.kinds ?? ["bp", "activity", "sleep", "vitals"];
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });

  // A clinic device measures patients, not its owner: steps and sleep from it
  // would be the staff member's, and blood pressure belongs to whoever the
  // open measurement session names. So it reads blood pressure only, and each
  // reading goes through attribution instead of straight into a record.
  const forClinic = connection.isClinicDevice === true;
  const wanted: Array<"bp" | "activity" | "sleep" | "vitals"> = forClinic ? ["bp"] : kinds;

  const [bp, activity, sleep] = await Promise.all([
    wanted.includes("bp") ? withingsBloodPressure(token, since, opts.until) : Promise.resolve([]),
    wanted.includes("activity") ? withingsActivity(token, since) : Promise.resolve([]),
    wanted.includes("sleep") ? withingsSleep(token, since) : Promise.resolve([]),
  ]);

  let bpSaved = 0;
  if (forClinic) {
    const { attributeClinicReading } = await import("@/lib/clinic-device");
    for (const reading of bp) {
      const outcome = await attributeClinicReading(
        { id: connection.id, clinicId: connection.clinicId ?? null, isClinicDevice: true },
        reading
      );
      if (outcome.kind === "assigned") bpSaved++;
      if (outcome.kind === "unassigned") {
        console.log(`[withings-ingest] unassigned reading (${outcome.reason}) id=${outcome.id}`);
      }
    }
  } else {
    bpSaved = await saveBloodPressure(userId, me?.clinicId ?? null, bp);
  }

  for (const a of activity) {
    await upsertPoint(userId, connection.id, "ACTIVITY", a.dataDate, {
      steps: a.steps,
      activeCalories: a.activeCalories,
      totalCalories: a.totalCalories,
      activeMinutes: a.activeMinutes,
    });
  }
  // SpO2, temperature and heart rate (activity 074, T-8). One row per day,
  // like everything else the screens draw. A metric the account does not have
  // stays absent — `upsertPoint` writes only the fields it is given, so a day
  // with SpO2 and no temperature does not overwrite anything with a zero.
  let vitalsDays = 0;
  let ecgRecords = 0;
  if (wanted.includes("vitals")) {
    try {
      const { withingsVitals, vitalsByDay, withingsEcg } = await import("@/lib/withings-vitals");
      const vitals = await withingsVitals(token, since, opts.until);
      for (const day of vitalsByDay(vitals)) {
        const fields: Record<string, unknown> = { rawPayload: JSON.stringify({ samples: day.samples }) };
        if (day.spo2 !== undefined) fields.spo2 = day.spo2;
        if (day.bodyTemperature !== undefined) fields.bodyTemperature = day.bodyTemperature;
        // Não há coluna para temperatura de pele, e ela não é temperatura
        // corporal — vai para o payload em vez de ser pedida e jogada fora.
        if (day.skinTemperature !== undefined) {
          fields.rawPayload = JSON.stringify({ samples: day.samples, skinTemperature: day.skinTemperature });
        }
        if (day.restingHr !== undefined) fields.restingHr = day.restingHr;
        await upsertPoint(userId, connection.id, "VITALS", day.dataDate, fields);
        vitalsDays++;
      }

      // The fact that an ECG happened and what the device concluded — never the
      // trace, and never our reading of it.
      const ecg = await withingsEcg(token, since, opts.until);
      for (const rec of ecg) {
        const dataDate = rec.recordedAt.toISOString().split("T")[0];
        await upsertPoint(userId, connection.id, "ECG", dataDate, {
          restingHr: rec.heartRate ?? undefined,
          rawPayload: JSON.stringify({
            afibClassification: rec.afibClassification,
            signalId: rec.signalId,
            recordedAt: rec.recordedAt.toISOString(),
          }),
        });
        ecgRecords++;
      }
    } catch (e: any) {
      // An account without these metrics must not cost the patient their blood
      // pressure, sleep and activity, which are already saved by this point.
      console.error("[withings-ingest] vitals failed:", e?.message);
    }
  }

  for (const n of sleep) {
    await upsertPoint(userId, connection.id, "SLEEP", n.dataDate, {
      sleepDuration: n.sleepDuration,
      deepMinutes: n.deepMinutes,
      remMinutes: n.remMinutes,
      lightMinutes: n.lightMinutes,
      awakeMinutes: n.awakeMinutes,
      hrv: n.hrv,
      restingHr: n.restingHr,
    });
  }

  // O carimbo de "chegou dado" mora aqui, e não em cada chamador: são três
  // (webhook, cron e o botão do paciente) e dois deles carimbavam enquanto o
  // terceiro não — quem sincronizasse pelo botão recebia o dado e continuava
  // marcado como mudo (achado do code review da T-11).
  //
  // E a data é a da **leitura mais nova**, não `agora`. Com `agora`, a janela
  // do cron olha alguns dias para trás, então um aparelho que parou ontem
  // continuaria devolvendo as medidas de antes por mais três ou quatro
  // rodadas — e cada uma delas empurraria o relógio do silêncio para a frente.
  // O silêncio nunca seria detectado no prazo. A data da medida não mente.
  const latestAt = newestMoment(bp, activity, sleep);
  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncedAt: new Date(),
      status: "CONNECTED",
      ...(latestAt ? { lastReadingAt: latestAt } : {}),
    },
  });

  return {
    bloodPressure: bpSaved,
    activityDays: activity.length,
    sleepNights: sleep.length,
    vitalsDays,
    ecgRecords,
  };
}
