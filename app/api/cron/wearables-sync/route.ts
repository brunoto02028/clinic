import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ingestWithings } from "@/lib/withings-ingest";
import { subscribeAndRecord, deliveryState } from "@/lib/withings-subscriptions";
import { avisarSeCaiu } from "@/lib/wearable-caiu";

/**
 * Quanto tempo uma confirmacao de assinatura vale (114 T-3).
 *
 * **Uma hora**, que na pratica quer dizer *toda corrida*: o cron corre de duas
 * em duas horas, entao qualquer valor abaixo disso reconfirma sempre.
 *
 * Comecou em doze, e o Bruno pediu menos — *"assim que chegar o meu relogio vai
 * ser bom para testar, porque ele vai estar conectado 24 horas."* Ele tem razao
 * e o numero era timido: o que custa e **uma chamada por conexao por corrida**,
 * e o plano gratuito da Withings vai ate 5.000 por dia. Com doze corridas
 * diarias e um punhado de conexoes, isto nao chega perto do limite.
 *
 * O limitador real nunca foi este numero: era a **frequencia do cron**. Com ele
 * de seis em seis horas, doze horas significava reconfirmar em corridas
 * alternadas. Os dois desceram juntos.
 */
const CONFIRMACAO_VALE_MS = 1 * 60 * 60 * 1000;

/**
 * Se vale a pena perguntar a Withings se ela ainda esta a avisar.
 *
 * **O defeito que isto conserta:** a condicao aqui era `!c.notifyCheckedAt` —
 * ou seja, a assinatura era confirmada **uma vez na vida**. Depois da primeira
 * confirmacao bem sucedida, `notifyCheckedAt` ficava preenchido e ninguem
 * voltava a perguntar. Se a Withings deixasse de avisar depois disso — por
 * expiracao, por revogacao, ou porque o nosso webhook respondeu errado uma vez
 * — o silencio durava para sempre, e a tela continuava a dizer "conectado".
 *
 * O Bruno, 30/09/2026: *"essa conexao eu quero ter certeza que nao vai ser
 * perdida."* Uma confirmacao unica nao da essa certeza; uma reconfirmacao
 * periodica da.
 *
 * Tres motivos para perguntar de novo:
 *
 * - **nunca perguntamos** — o caso original;
 * - **a resposta esta velha** — mais do que `CONFIRMACAO_VALE_MS`, que hoje e
 *   uma hora. O numero vive na constante, e nao aqui: um comentario com o
 *   valor escrito a mao fica velho no primeiro ajuste, e ja tinha ficado.
 * - **a resposta era incompleta** — a Withings confirmou parte dos tipos, ou
 *   nenhum. `deliveryState` chama a isso `partial` e `silent`, e os dois
 *   significam que ha dado a nao chegar.
 */
function precisaReconfirmar(c: {
  notifyCheckedAt?: Date | null;
  notifyConfirmedAppli?: number[] | null;
}): boolean {
  if (!c.notifyCheckedAt) return true;
  const estado = deliveryState(c);
  if (estado !== "receiving") return true;
  return Date.now() - new Date(c.notifyCheckedAt).getTime() > CONFIRMACAO_VALE_MS;
}

export const dynamic = "force-dynamic";

/**
 * The safety net under the webhook.
 *
 * Two places in this codebase said a scheduled sync existed — the OAuth
 * callback, explaining why a failed subscription was survivable, and the
 * clinic-device attribution, explaining why readings are deduplicated by
 * Withings' own group id. Neither was true: nothing in app/api/cron touched a
 * wearable, and the only sync was a button the patient could press. The
 * notification was the single path, so a measurement taken while the container
 * was restarting was a measurement lost, and the deduplication existed for a
 * second path that never ran (activity 075, T-11).
 *
 * Now it runs. Dedup by `grpid` is what makes it safe to overlap with the
 * webhook, and the window deliberately reaches further back than the last
 * reading: a gap is the thing being repaired, so the query has to cover it.
 *
 * Call: curl -X POST https://bpr.clinic/api/cron/wearables-sync?key=SECRET
 */

/** How far back to look beyond the last reading. A missed day is the point. */
const SLACK_DAYS = 3;
const MAX_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Quem sincronizou há mais tempo vai primeiro: se o orçamento acabar, a
  // rodada seguinte pega a cauda em vez de repetir sempre a mesma cabeça.
  const connections = await (prisma as any).wearableConnection.findMany({
    where: { provider: "WITHINGS", status: { in: ["CONNECTED", "ERROR"] } },
    orderBy: { lastSyncedAt: "asc" },
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      isClinicDevice: true,
      clinicId: true,
      // É por ele que se sabe que esta conexão pessoal divide a conta com a da
      // clínica — e, sendo assim, não processa pressão (092 T-1). Sem isto a
      // varredura diária voltaria a salvar no prontuário do dono as medições
      // feitas nos pacientes, alertas inclusive.
      providerUserId: true,
      lastReadingAt: true,
      lastSyncedAt: true,
      notifyCheckedAt: true,
      // Sem isto, `deliveryState` le `undefined` e diz "silent" para toda a
      // gente — o que faria reconfirmar em toda corrida, por uma razao falsa.
      notifyConfirmedAppli: true,
      createdAt: true,
    },
  });

  let synced = 0;
  let withData = 0;
  let failed = 0;
  let checked = 0;
  const totals = { bloodPressure: 0, activityDays: 0, sleepNights: 0, vitalsDays: 0 };

  // O scheduled task do Coolify corta em 300s. Parar por conta própria antes
  // disso deixa o trabalho pela metade **de propósito**, com a ordem acima
  // garantindo que a próxima rodada continue de onde esta parou — melhor que
  // ser morto no meio de uma escrita.
  const deadline = Date.now() + 240_000;
  let ranOut = false;

  for (const c of connections) {
    if (Date.now() > deadline) {
      ranOut = true;
      break;
    }

    // A connection nobody has asked about — made before the subscription check
    // existed, or whose check never reached Withings. Doing it here means it
    // no longer waits for somebody to open a screen.
    //
    // A Withings **rotaciona o refresh token a cada refresh**, e grava no
    // banco. O objeto em memória fica velho na hora: reusá-lo logo em seguida
    // significa tentar refrescar com um token que eles acabaram de invalidar —
    // e a ingestão falhava justamente nas conexões que este cron existe para
    // resgatar. Por isso a conexão é relida antes de seguir.
    if (precisaReconfirmar(c)) {
      const outcome = await subscribeAndRecord(c);
      if (outcome.answered) checked++;
      const fresh = await (prisma as any).wearableConnection.findUnique({
        where: { id: c.id },
        select: { accessToken: true, refreshToken: true, tokenExpiresAt: true },
      });
      if (fresh) {
        c.accessToken = fresh.accessToken;
        c.refreshToken = fresh.refreshToken;
        c.tokenExpiresAt = fresh.tokenExpiresAt;
      }
    }

    const anchor = c.lastReadingAt ?? c.lastSyncedAt ?? c.createdAt ?? new Date();
    const since = new Date(
      Math.max(
        new Date(anchor).getTime() - SLACK_DAYS * DAY_MS,
        Date.now() - MAX_WINDOW_DAYS * DAY_MS
      )
    );

    try {
      const counts = await ingestWithings(c.userId, c, { since });
      synced++;
      totals.bloodPressure += counts.bloodPressure;
      totals.activityDays += counts.activityDays;
      totals.sleepNights += counts.sleepNights;
      totals.vitalsDays += counts.vitalsDays;

      const arrived =
        counts.bloodPressure +
          counts.activityDays +
          counts.sleepNights +
          counts.vitalsDays +
          counts.ecgRecords >
        0;
      if (arrived) withData++;

      // `lastSyncedAt` e `lastReadingAt` são escritos dentro de
      // `ingestWithings`, com a data da leitura mais nova — aqui só contamos.
    } catch (err: any) {
      failed++;
      // One patient's expired token must not stop the other patients' sync.
      console.error(`[cron/wearables-sync] connection ${c.id}:`, err?.message);
    }

    /**
     * Quando a ligacao cai, **a clinica fica a saber** (114 T-7).
     *
     * O Bruno: *"se cair a conexao na conta do paciente, precisa aparecer uma
     * notificacao para o paciente e para a clinica dizendo que a conexao foi
     * perdida e que ele precisa reconectar."*
     *
     * Ate aqui nada acontecia. A ligacao emudecia e a unica forma de descobrir
     * era alguem abrir a tela e reparar — o que costuma ser quando ja se
     * precisava das leituras.
     *
     * Vai pela maquina que ja existe: uma linha em `Alert`, deduplicada pelo
     * dia, na tela que a clinica ja tem para isto. `createAlert` devolve
     * `created: false` quando o alerta do dia ja existia, e e isso que impede o
     * e-mail diario de virar ruido.
     *
     * **A releitura e deliberada.** `ingestWithings` acabou de escrever
     * `lastReadingAt`, e o objeto em memoria ficou velho — julgar o silencio
     * pelo valor antigo marcaria como muda uma ligacao que acabou de entregar.
     */
    try {
      const atual = await (prisma as any).wearableConnection.findUnique({
        where: { id: c.id },
        select: {
          status: true,
          lastReadingAt: true,
          createdAt: true,
          notifyCheckedAt: true,
          notifyConfirmedAppli: true,
        },
      });
      if (atual) await avisarSeCaiu(c.id, c.userId, atual);
    } catch (err: any) {
      // Um aviso que falha nao pode derrubar a sincronia — ela e o trabalho.
      console.error(`[cron/wearables-sync] aviso ${c.id}:`, err?.message);
    }
  }

  console.log(
    `[cron/wearables-sync]${ranOut ? " (orcamento esgotado)" : ""} connections=${connections.length} synced=${synced} withData=${withData} failed=${failed} subscriptionsChecked=${checked} bp=${totals.bloodPressure}`
  );

  return NextResponse.json({
    connections: connections.length,
    ranOut,
    synced,
    withData,
    failed,
    subscriptionsChecked: checked,
    totals,
  });
}
