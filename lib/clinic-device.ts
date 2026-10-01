import { prisma } from "@/lib/db";
import { donoDoAparelho } from "@/lib/dono-do-aparelho";

/**
 * A nota que **a regra** escreve numa leitura auto-atribuída (114 T-5).
 *
 * Uma constante, e não a frase solta nos dois sítios, porque ela é escrita aqui
 * e apagada na rota de mover — e um critério que existe em dois lugares como
 * texto acaba a divergir por uma vírgula.
 *
 * O que ela torna possível é a distinção que faltava: **o campo `notes` de uma
 * leitura auto-atribuída não é propriedade da regra**. O terapeuta pode escrever
 * ali, e escreve — a ficha oferece o lápis em todas as linhas. Ao mover, só esta
 * frase sai; o que uma pessoa escreveu fica.
 */
export const NOTA_DA_ATRIBUICAO_AUTOMATICA =
  "Withings (clinic device, auto-attributed to the account owner)";
import { logAudit } from "@/lib/system-logger";
import type { WithingsBpReading } from "@/lib/withings";
import {
  MATCHABLE_SESSION_STATUSES,
  SESSION_GRACE_MS,
  sessionCovers,
} from "@/lib/clinic-session-match";

/**
 * Whose record a reading from the clinic's own cuff belongs to.
 *
 * A BPM Connect on the reception desk is one Withings account measuring ten
 * patients a day, which breaks the assumption the rest of the integration is
 * built on — one account, one patient. Withings cannot tell us who was
 * measured, so the clinic tells us in advance: the therapist opens a
 * three-minute window on a patient's record, and the reading that falls inside
 * it is that patient's.
 *
 * Everything here is written against one rule: **ambiguity never becomes a
 * guess**. No window, or more than one, and the reading goes to an inbox for a
 * human to assign. Blood pressure in the wrong record is a clinical error;
 * asking for a click is not.
 */

/** Three minutes, from the spec. Long enough to sit down and measure. */
export const SESSION_WINDOW_MS = 3 * 60 * 1000;

/**
 * Grace before the window opens.
 *
 * The therapist sometimes presses "Measure" with the cuff already inflating,
 * and the measurement is then stamped a few seconds before the session exists.
 *
 * Mora em `clinic-session-match.ts` junto com a regra que a usa, e é
 * reexportada aqui porque era daqui que todo mundo a importava.
 */
export { SESSION_GRACE_MS } from "@/lib/clinic-session-match";

export type AttributionOutcome =
  | { kind: "assigned"; patientId: string; readingId: string; sessionId: string }
  /**
   * Arquivada no prontuário do **dono do aparelho**, sem sessão (114 T-5).
   *
   * Um desfecho próprio, e não `assigned` com um `sessionId` vazio: são coisas
   * diferentes. `assigned` quer dizer *alguém disse de quem era*; isto quer
   * dizer *a regra decidiu, e pode estar errado*. Um `sessionId: ""` faria as
   * duas parecerem a mesma no lugar onde a diferença importa.
   */
  | { kind: "owner"; patientId: string; readingId: string }
  | { kind: "unassigned"; reason: "no-session" | "ambiguous"; id: string }
  | { kind: "duplicate" };

export interface ClinicConnection {
  id: string;
  clinicId: string | null;
  isClinicDevice: boolean;
}

/**
 * Este arquivo **não** conhece a conta na Withings, de propósito.
 *
 * Chegou a receber o `providerUserId` para, sem sessão aberta, achar o dono
 * pessoal do mesmo aparelho e gravar a leitura nele. O review de 27/09/2026
 * derrubou: "sem sessão" não quer dizer "foi o dono", e o campo saiu junto.
 * Quem decide o que a conta compartilhada faz é `lib/withings-routing.ts`,
 * antes de a leitura chegar aqui.
 */

/**
 * Sessions whose window contains this measurement.
 *
 * The comparison is against the measurement's own timestamp, never against
 * `now()`: the cuff syncs over Wi-Fi when it finishes and the webhook arrives
 * later, so "now" would attribute the wrong reading or discard a good one.
 *
 * E por isso uma janela **expirada** também conta. Ela descreve um intervalo de
 * tempo verdadeiro; o que perdeu foi a contagem na tela. Sem isto, a leitura
 * que só subia horas depois — visita domiciliar, manguito sem rede conhecida —
 * chegava com a sessão já marcada `EXPIRED` pela varredura e ia para a caixa de
 * entrada, com a resposta certa existindo e sendo descartada. Quem decide fica
 * em `clinic-session-match.ts`, fora do banco, para poder ser testado.
 */
async function matchingSessions(connectionId: string, measuredAt: Date) {
  const candidatas = await (prisma as any).clinicMeasurementSession.findMany({
    where: {
      connectionId,
      status: { in: [...MATCHABLE_SESSION_STATUSES] },
      openedAt: { lte: new Date(measuredAt.getTime() + SESSION_GRACE_MS) },
      expiresAt: { gte: measuredAt },
    },
    orderBy: { openedAt: "desc" },
  });
  // A consulta já filtra pelo mesmo intervalo; passar pela regra pura mantém
  // uma única definição de "esta janela cobre esta medição".
  return candidatas.filter((c: any) => sessionCovers(c, measuredAt));
}

/**
 * Files one reading from the clinic's device.
 *
 * Returns what happened, so the caller can log it — this runs from a webhook
 * where nobody is watching, and "nothing happened" must never be silent.
 */

export async function attributeClinicReading(
  connection: ClinicConnection,
  reading: WithingsBpReading,
  raw?: unknown
): Promise<AttributionOutcome> {
  const clinicId = connection.clinicId;
  if (!clinicId) {
    // A device with no clinic cannot be attributed to anyone in particular.
    // Storing it unassigned would put it in an inbox nobody owns.
    throw new Error("Clinic device has no clinic");
  }

  // The same measurement reaches us twice: once from the webhook, once from
  // the daily sync at /api/cron/wearables-sync — which, until activity 075
  // T-11, did not exist, so this deduplication was guarding a second path that
  // never ran. Withings' own group id is the key, and it has to be
  // checked on *both* sides — the inbox and the records. Checking only the
  // inbox put a re-delivered reading there a second time even though it had
  // already been filed, because by then its session was closed and no window
  // matched any more: the therapist would see the same measurement waiting to
  // be assigned right after assigning it.
  // Without an id from Withings there is nothing to deduplicate on, and the
  // shared cuff is exactly where a made-up id would collide between two
  // patients. It still gets filed — into the inbox, where a person decides.
  if (reading.measureId) {
    const [inInbox, inRecord] = await Promise.all([
      (prisma as any).unassignedMeasurement.findFirst({
        where: { connectionId: connection.id, withingsMeasureId: reading.measureId },
        select: { id: true },
      }),
      (prisma as any).bloodPressureReading.findFirst({
        where: { clinicId, withingsMeasureId: reading.measureId },
        select: { id: true },
      }),
    ]);
    if (inInbox || inRecord) return { kind: "duplicate" };
  } else {
    // Sem id da Withings não há chave de deduplicação — e isso era
    // sobrevivível enquanto o webhook entregava cada medida uma vez. Com o
    // cron da T-11 relendo a mesma janela todo dia, a mesma leitura viraria
    // uma linha nova na caixa de entrada por dia, por até trinta dias.
    // O horário mais os dois números é o que essa leitura tem de próprio;
    // duas medidas iguais no mesmo segundo, no mesmo aparelho, são a mesma.
    const igual = await (prisma as any).unassignedMeasurement.findFirst({
      where: {
        connectionId: connection.id,
        measuredAt: reading.measuredAt,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
      },
      select: { id: true },
    });
    if (igual) return { kind: "duplicate" };
  }

  const sessions = await matchingSessions(connection.id, new Date(reading.measuredAt));

  /**
   * Sem janela aberta, a leitura vai para a caixa — **e não para o dono**.
   *
   * Eu tinha escrito o contrário: sem sessão, atribuir ao dono do aparelho. O
   * review de 27/09/2026 derrubou isso, e o Bruno concordou.
   *
   * O argumento que me convenceu: *"sem sessão"* não quer dizer *"foi o
   * dono"* — quer dizer **"ninguém disse quem foi"**. Vale para ele medindo em
   * si mesmo e vale igual para o terapeuta que esqueceu de abrir a janela, e o
   * sistema não distingue os dois. Com o atalho, a pressão de um paciente
   * entrava no prontuário do dono em silêncio, marcada como se ele tivesse
   * medido em casa, e sem registro de auditoria.
   *
   * Um clique na caixa de entrada é barato. Pressão de paciente no prontuário
   * errado não é — e é a regra que este arquivo inteiro segue: **ambiguidade
   * nunca vira palpite**.
   *
   * E o dono medindo em si mesmo? Ele abre uma janela no próprio cadastro —
   * um toque, ele também é paciente — ou atribui daqui. Num aparelho
   * compartilhado, **toda leitura precisa dizer de quem é**, e isso vale para
   * o dono como vale para qualquer um.
   */
  /**
   * Sem janela aberta, a leitura vai para **o dono do aparelho** — quando ele
   * existe (114 T-5, decidido pelo Bruno em 30/09/2026).
   *
   * O parágrafo abaixo explica porque isto tinha sido derrubado a 27/09, e o
   * argumento continua de pé. O que mudou foi a decisão de quem é dono do
   * risco, mais a metade que a torna reversível: a leitura fica marcada como
   * `autoAttributed` e pode ser movida.
   *
   * "Dono" não é adivinhado — ver `dono-do-aparelho.ts`. Ele só existe quando a
   * **mesma conta do provedor** está ligada duas vezes, uma delas pelo próprio
   * paciente, no app. Sem isso, a leitura continua a ir para a caixa.
   */
  if (sessions.length === 0 && reading.measureId) {
    const dono = await donoDoAparelho(connection.id, clinicId);
    if (dono) {
      const auto = await (prisma as any).bloodPressureReading.create({
        data: {
          patientId: dono.patientId,
          clinicId,
          systolic: reading.systolic,
          diastolic: reading.diastolic,
          heartRate: reading.heartRate ?? null,
          method: "CLINIC_DEVICE",
          source: "CLINIC_DEVICE",
          // `OTHER`, e não `HOME`: ninguém disse onde foi medida. Dizer "em
          // casa" seria inventar um facto sobre uma leitura que já está a ser
          // atribuída por regra, e não por alguém.
          context: "OTHER",
          measuredAt: reading.measuredAt,
          withingsMeasureId: reading.measureId,
          autoAttributed: true,
          notes: NOTA_DA_ATRIBUICAO_AUTOMATICA,
        },
        select: { id: true },
      });
      return { kind: "owner", patientId: dono.patientId, readingId: auto.id };
    }
  }

  if (sessions.length !== 1 || !reading.measureId) {
    const row = await (prisma as any).unassignedMeasurement.create({
      data: {
        clinicId,
        connectionId: connection.id,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        heartRate: reading.heartRate,
        measuredAt: reading.measuredAt,
        withingsMeasureId: reading.measureId,
        raw: (raw ?? null) as any,
      },
      select: { id: true },
    });
    return {
      kind: "unassigned",
      reason: sessions.length === 1 ? "no-session" : sessions.length === 0 ? "no-session" : "ambiguous",
      id: row.id,
    };
  }

  const session = sessions[0];

  // The webhook and the scheduled sync can carry the same measurement at the
  // same moment; the unique index then raises P2002 on whichever loses. That
  // is a duplicate, not a failure.
  let created: { id: string };
  try {
    created = await (prisma as any).bloodPressureReading.create({
      data: {
        patientId: session.patientId,
        clinicId,
        systolic: reading.systolic,
        diastolic: reading.diastolic,
        heartRate: reading.heartRate,
        method: "CLINIC_DEVICE",
        source: "CLINIC_DEVICE",
        context: session.context,
        // The therapist who opened the window measured it, the same way a
        // clinician logging a reading by hand is its `recordedBy` (activity 69).
        recordedById: session.openedById,
        measuredAt: reading.measuredAt,
        withingsMeasureId: reading.measureId,
        notes: "Withings (clinic device)",
      },
      select: { id: true },
    });
  } catch (e: any) {
    if (e?.code === "P2002") return { kind: "duplicate" };
    throw e;
  }

  await (prisma as any).clinicMeasurementSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", closedAt: new Date(), readingId: created.id },
  });

  // The same thing that happens when a reading arrives from the app: the
  // clinic is told if it crosses a line, and the patient only in a crisis.
  // Without this the cuff on the reception desk recorded 210/130 and nobody
  // heard about it — while the app told the patient their therapist had.
  const { afterBloodPressureRecorded } = await import("@/lib/bp-alerts");
  await afterBloodPressureRecorded({
    patientId: session.patientId,
    clinicId,
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    measuredAt: new Date(reading.measuredAt),
    via: "clinic-device",
  }).catch((e) => console.error("[clinic-device] alert failed:", e?.message));

  await logAudit({
    userId: session.openedById,
    userEmail: "",
    userRole: "STAFF",
    action: "CLINIC_MEASUREMENT_ASSIGN",
    entity: "BloodPressureReading",
    entityId: created.id,
    description: `Clinic device reading ${reading.systolic}/${reading.diastolic} attributed automatically`,
    metadata: {
      sessionId: session.id,
      patientId: session.patientId,
      context: session.context,
      measuredAt: reading.measuredAt,
      automatic: true,
    },
  });

  return { kind: "assigned", patientId: session.patientId, readingId: created.id, sessionId: session.id };
}

/**
 * Marks the windows that have run out.
 *
 * Done on read rather than by a cron: an expired session has no effect on
 * anything until someone looks at it, and one more scheduled job is one more
 * thing that can stop running without anyone noticing.
 */
export async function expireStaleSessions(connectionId?: string): Promise<number> {
  const res = await (prisma as any).clinicMeasurementSession.updateMany({
    where: {
      status: "OPEN",
      expiresAt: { lt: new Date() },
      ...(connectionId ? { connectionId } : {}),
    },
    data: { status: "EXPIRED", closedAt: new Date() },
  });
  return res.count;
}

/** The clinic's measuring device, if it has one. */
export async function clinicDevice(clinicId: string) {
  return (prisma as any).wearableConnection.findFirst({
    where: { clinicId, isClinicDevice: true, status: "CONNECTED" },
    select: {
      id: true, deviceLabel: true, provider: true, clinicId: true, isClinicDevice: true,
      // Se a Withings confirmou que manda. O manguito da recepção alimenta
      // vários pacientes e era o único sem nenhuma tela dizendo se está mudo:
      // o /admin/biohacking só varre quem tem papel PATIENT, e esta conexão
      // pertence a quem autorizou (atividade 075, T-10).
      notifyConfirmedAppli: true, notifyCheckedAt: true,
      lastReadingAt: true, createdAt: true, status: true,
      // **Falamos com a Withings, e com que resposta.** Sem estes dois, a tela
      // da caixa mostra "assinatura confirmada" e "nada ha N dias" lado a lado,
      // e nao ha como saber se a chamada sequer foi feita — foi o beco em que o
      // manguito do Bruno ficou durante seis dias.
      lastSyncedAt: true, lastSyncError: true, lastSyncErrorAt: true,
      accessToken: true, refreshToken: true, tokenExpiresAt: true,
    },
  });
}
