export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import { clinicDevice, expireStaleSessions, SESSION_WINDOW_MS } from "@/lib/clinic-device";
import { deliveryState, ensureCheckedSoon } from "@/lib/withings-subscriptions";
import { daysSilent, isSilent, silenceThreshold } from "@/lib/wearable-silence";
import { ehFatal } from "@/lib/withings-estado-da-ligacao";

/**
 * Opening the window in which the clinic's cuff measures one named patient
 * (activity 074, T-14).
 *
 * The therapist presses "Measure blood pressure" on a patient's record; for
 * the next three minutes, a reading from that device is that patient's. It is
 * the only thing that decides whose record the measurement enters, so it is
 * deliberately explicit, short, and never inferred.
 */

const CONTEXTS = ["PRE_SESSION", "POST_SESSION", "OTHER"] as const;

/** GET — is there a device, and is a window already open on it? */
export async function GET(req: NextRequest) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!actor.clinicId) return NextResponse.json({ device: null, open: null });

  const device = await clinicDevice(actor.clinicId);
  if (!device) {
    /**
     * **Há aparelho, mas não está a servir** — e isso tem de se ver (121 T-10).
     *
     * `clinicDevice` só devolve ligações `CONNECTED`. Com a ligação em `ERROR`
     * — token morto à espera de reautorização — a tela do paciente ficava
     * **sem botão nenhum**, sem uma palavra a dizer porquê. O terapeuta chega
     * ao pé do paciente com o aparelho na mão e não tem onde carregar, e a
     * única leitura possível é *"esta clínica não tem aparelho"*, que é falso.
     *
     * É o mesmo defeito que a 120 e a 121 inteiras combateram, do lado da
     * interface: uma falha nossa com a cara de uma ausência.
     */
    const parado = await (prisma as any).wearableConnection.findFirst({
      where: { clinicId: actor.clinicId, isClinicDevice: true, status: { not: "DISCONNECTED" } },
      select: { id: true, deviceLabel: true, status: true, needsReauthAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      device: null,
      open: null,
      ...(parado
        ? {
            deviceParado: {
              label: parado.deviceLabel,
              status: parado.status,
              precisaReconectar: !!parado.needsReauthAt,
            },
          }
        : {}),
    });
  }

  await expireStaleSessions(device.id);
  const open = await (prisma as any).clinicMeasurementSession.findFirst({
    where: { connectionId: device.id, status: "OPEN" },
    select: {
      id: true, patientId: true, context: true, openedAt: true, expiresAt: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  // Conexão de antes desta checagem existir: confere em segundo plano.
  ensureCheckedSoon(device);

  // `delivery` sai; token nenhum sai. O objeto é montado campo a campo de
  // propósito — `clinicDevice` carrega os tokens para a checagem.
  // Assinatura confirmada e mesmo assim nada chegando é um estado próprio — e
  // neste aparelho é o mais caro de todos, porque a clínica mede achando que a
  // leitura vai entrar no prontuário (atividade 075, T-11).
  const limite = await silenceThreshold(actor.clinicId);

  return NextResponse.json({
    device: {
      id: device.id,
      label: device.deviceLabel,
      // `soPressao`: este aparelho é um manguito. Passos e sono nunca serão
      // confirmados nele, e exigi-los fazia `partial` ser o estado permanente —
      // um aviso âmbar que nunca apagava. Ver `deliveryState`.
      delivery: deliveryState(device, { soPressao: true }),
      daysSilent: daysSilent(device),
      silent: isSilent(device, limite),
      /**
       * **A autorização morreu, mas o estado ainda não o sabe** (achado do QA,
       * 03/10).
       *
       * `status: "ERROR"` só passou a ser escrito em 03/10. Uma ligação cuja
       * cadeia de tokens morreu **antes disso** continua `CONNECTED` — e é
       * exactamente o estado em que o Bruno esteve 27 dias. Aí `clinicDevice`
       * devolve-a, a tela desenha o botão de medir como se nada fosse, e o
       * `lastSyncError` que diz `invalid_grant: refresh_token expired` vai na
       * resposta sem ninguém o ler.
       *
       * A pergunta é feita à mensagem, com a mesma régua que o resto do
       * sistema usa para decidir o que é fatal — e não ao `status`, que é a
       * coisa que pode estar velha.
       */
      precisaReconectar: !!device.needsReauthAt || ehFatal(device.lastSyncError),
      /**
       * Os três dados que respondem "por que nada chega?" (092 T-3).
       *
       * A tela mostrava o aviso âmbar só quando o estado era `silent` ou
       * `partial`. Com `receiving` **e** com `unchecked` ela não dizia nada —
       * ou seja, "está tudo certo" e "não fazemos ideia" eram visualmente
       * idênticos. O Bruno passou semanas sem uma leitura sequer com a página
       * dizendo apenas "aparelho conectado".
       */
      lastReadingAt: device.lastReadingAt ?? null,
      checkedAt: device.notifyCheckedAt ?? null,
      confirmedAppli: device.notifyConfirmedAppli ?? [],
      /**
       * **Falavamos com a Withings?** — e, se sim, com que resposta.
       *
       * Faltava a quarta pergunta, e era a que ficava sem resposta no caso do
       * Bruno: assinatura confirmada, caixa vazia, nada ha seis dias. Tres
       * factos que nao apontam para lado nenhum sem saber se a chamada sequer
       * foi feita.
       *
       * `lastSyncedAt` diz quando falamos; `lastSyncError` diz o que eles
       * responderam quando correu mal. Juntos separam *"nao pedimos"* de
       * *"pedimos e nao veio"* — que exigem consertos opostos.
       */
      lastSyncedAt: device.lastSyncedAt ?? null,
      lastSyncError: device.lastSyncError ?? null,
      lastSyncErrorAt: device.lastSyncErrorAt ?? null,
    },
    open,
  });
}

/** POST — open a window on this patient. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const patientId = typeof body?.patientId === "string" ? body.patientId : "";
  const context = CONTEXTS.includes(body?.context) ? body.context : "PRE_SESSION";
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const guard = await staffPatientAccess(req, patientId);
  if (guard.response) return guard.response;
  const clinicId = guard.actor.clinicId;
  if (!clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const device = await clinicDevice(clinicId);
  if (!device) {
    return NextResponse.json({ error: "This clinic has no measuring device connected" }, { status: 400 });
  }

  await expireStaleSessions(device.id);

  // One window per device. Closing the previous one silently is the kind of
  // convenience that files a reading under the wrong patient, so the second
  // request is refused and says who is waiting.
  const open = await (prisma as any).clinicMeasurementSession.findFirst({
    where: { connectionId: device.id, status: "OPEN" },
    select: {
      id: true, patientId: true, expiresAt: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  if (open) {
    return NextResponse.json(
      {
        error: "A measurement is already in progress on this device",
        errorPt: "Já existe uma medição em andamento neste aparelho",
        open,
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const session = await (prisma as any).clinicMeasurementSession.create({
    data: {
      clinicId,
      patientId,
      connectionId: device.id,
      context,
      status: "OPEN",
      openedById: guard.actor.userId,
      openedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_WINDOW_MS),
    },
    select: { id: true, patientId: true, context: true, openedAt: true, expiresAt: true, status: true },
  });

  await logAudit({
    userId: guard.actor.userId,
    userEmail: "",
    userRole: guard.actor.role,
    action: "CLINIC_MEASUREMENT_SESSION_OPEN",
    entity: "ClinicMeasurementSession",
    entityId: session.id,
    description: `Measurement window opened on ${device.deviceLabel ?? "clinic device"}`,
    metadata: { patientId, context, expiresAt: session.expiresAt },
  });

  return NextResponse.json({ session, device: { id: device.id, label: device.deviceLabel } });
}
