import { prisma } from "@/lib/db";
import {
  WITHINGS_APPLI,
  WITHINGS_APPLI_WE_WANT,
  WITHINGS_APPLI_ESSENCIAIS,
  confirmWithingsSubscriptions,
  withingsAccessToken,
  withingsCallbackUrl,
  withingsSubscribe,
} from "@/lib/withings";

/**
 * Asking Withings to send us measurements, and then checking that it will.
 *
 * The asking has always been here; the checking is what was missing. The
 * subscribe call is deliberately best-effort — the patient is standing in
 * front of a redirect and a notification that failed to register must not cost
 * them the connection — so its failure was logged and swallowed. Nothing read
 * the log. A device could be authorised, marked CONNECTED, and never send a
 * single reading, and the only trace was a line in a container log nobody was
 * going to open (activity 075, T-10).
 *
 * Now the answer is read back from Withings and written on the connection, so
 * three different things stop looking alike: not connected, connected but
 * sending nothing, and receiving.
 *
 * Both the OAuth callback and the retry button go through here, so the two can
 * never drift apart about what "subscribed" means.
 */

export interface SubscriptionOutcome {
  confirmed: number[];
  missing: number[];
  /** Whether Withings answered at all. False means we learned nothing. */
  answered: boolean;
  /** Whether the answer reached the database. */
  recorded: boolean;
  checkedAt: Date | null;
}

interface TokenBearingConnection {
  id: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Subscribes to every kind we want, asks Withings which ones took, and records
 * it. Never throws.
 *
 * A check that could not be made is not recorded at all: `notifyCheckedAt`
 * stays as it was, so the connection keeps saying "nobody has asked" instead
 * of acquiring a date that would make it read as confirmed-silent. Telling a
 * patient their device is not sending, as a fact, because their provider had a
 * bad minute, is the failure mode worth spending a branch on.
 */
export async function subscribeAndRecord(
  connection: TokenBearingConnection,
  accessTokenOverride?: string
): Promise<SubscriptionOutcome> {
  const callbackUrl = withingsCallbackUrl();
  let confirmed: number[] = [];
  let answered = false;

  try {
    /*
     * **`assinatura`, e não `?`** (121 T-5).
     *
     * Este chamador ficou de fora quando os outros se identificaram, e o log de
     * produção mostrou-o: `[withings/token] ? renova ...`, logo acima do
     * `cron renova` da mesma ligação. Duas renovações da mesma passagem, e a
     * primeira sem nome — que é precisamente o que a T-5 existe para não voltar
     * a acontecer.
     */
    const token = accessTokenOverride ?? (await withingsAccessToken(connection, "assinatura"));

    await Promise.all(
      WITHINGS_APPLI_WE_WANT.map((appli) =>
        withingsSubscribe(token, callbackUrl, appli).catch((err) =>
          console.error(`[withings-subscriptions] subscribe appli=${appli}:`, err?.message)
        )
      )
    );

    const result = await confirmWithingsSubscriptions(token, callbackUrl);
    confirmed = result.confirmed;
    answered = result.answered > 0;
  } catch (err: any) {
    // A token that cannot be refreshed is exactly the case this exists to make
    // visible — but it is "we could not ask", not "they said no".
    console.error("[withings-subscriptions] could not check:", err?.message);
  }

  const checkedAt = answered ? new Date() : null;
  let recorded = false;
  if (answered) {
    try {
      // `as any` hides a missing model from the compiler, and a property access
      // on undefined throws before there is a promise to catch — so the guard
      // has to be synchronous too.
      await (prisma as any).wearableConnection.update({
        where: { id: connection.id },
        data: { notifyConfirmedAppli: confirmed, notifyCheckedAt: checkedAt },
      });
      recorded = true;
    } catch (e: any) {
      console.error("[withings-subscriptions] could not record:", e?.message);
    }
  }

  return {
    confirmed,
    /*
     * Aqui é **tudo o que pedimos**, e não só os essenciais: este número
     * diagnostica a subscrição em si — é por ele que se vê se o pedido do ECG
     * pegou. Quem decide se há alarme é o `deliveryState`.
     */
    missing: WITHINGS_APPLI_WE_WANT.filter((a) => !confirmed.includes(a)),
    answered,
    recorded,
    checkedAt,
  };
}

/**
 * Conexões que já existiam quando isto passou a existir nunca foram
 * perguntadas — e são justamente as que podem estar mudas hoje, que é o
 * problema que originou este trabalho. Sem isto elas ficariam `unchecked` para
 * sempre, verdes na tela do paciente e violetas na da clínica, e o único jeito
 * de sair disso seria refazer o OAuth inteiro.
 *
 * A conferência acontece quando alguém olha a lista: é barato, não bloqueia a
 * resposta, e cobre exatamente as conexões que interessam a alguém. O
 * estrangulamento existe porque uma checagem que falha não grava nada — sem
 * ele, uma Withings fora do ar viraria uma chamada por request.
 */
const ultimaTentativa = new Map<string, number>();
const INTERVALO_MS = 6 * 60 * 60 * 1000;

export function ensureCheckedSoon(connection: TokenBearingConnection & { notifyCheckedAt?: Date | null }): void {
  if (connection.notifyCheckedAt) return;
  const agora = Date.now();
  const antes = ultimaTentativa.get(connection.id);
  if (antes && agora - antes < INTERVALO_MS) return;
  ultimaTentativa.set(connection.id, agora);
  // Deliberadamente sem `await`: quem pediu a lista não deve esperar uma
  // conversa com a Withings, e o resultado aparece na próxima leitura.
  void subscribeAndRecord(connection).catch(() => {});
}

/**
 * What the screens say about a connection, from the two columns.
 *
 * `unchecked` is its own answer and not a failure: a connection made before
 * this existed has never been asked, and claiming it is silent would be as
 * wrong as claiming it is fine.
 *
 * `partial` covers every incomplete answer, and `missingKinds` says which ones
 * — the screens use it to name what is missing rather than say "some of your
 * measurements", because blood pressure missing and sleep missing are not the
 * same news in a clinic built around blood pressure.
 */
export type DeliveryState = "receiving" | "partial" | "silent" | "unchecked";

/**
 * `soPressao` existe porque um manguito não produz passos nem sono.
 *
 * `WITHINGS_APPLI_WE_WANT` inclui `ACTIVITY` e `SLEEP`, que fazem sentido para
 * a balança e o relógio de um paciente. Para o BPM Connect da recepção, esses
 * dois **nunca** vão ser confirmados — então `partial` era o estado normal e
 * permanente dele, e o painel da clínica dizia para sempre "a Withings não
 * confirmou que vai enviar leituras" **com a pressão confirmada**.
 *
 * Alarme permanente é pior que nenhum alarme: ensina a clínica a ignorá-lo, e
 * o dia em que a pressão realmente não estiver confirmada passa batido. Achado
 * do QA da 092.
 */
export function deliveryState(
  connection: {
    notifyConfirmedAppli?: number[] | null;
    notifyCheckedAt?: Date | null;
  },
  opts: { soPressao?: boolean } = {}
): DeliveryState {
  if (!connection.notifyCheckedAt) return "unchecked";
  const confirmed = connection.notifyConfirmedAppli ?? [];
  if (confirmed.length === 0) return "silent";
  /*
   * **Os essenciais, e não tudo o que pedimos** (121 T-9).
   *
   * A lista de subscrições passou a incluir ECG, VFC e temperatura. Medi-las
   * aqui faria toda a ligação existente aparecer como `partial` até à próxima
   * reconfirmação — um aviso de que a Withings não vai entregar, sobre uma
   * ligação que está a entregar tudo o que importa.
   */
  const querem = opts.soPressao ? [WITHINGS_APPLI.BLOOD_PRESSURE] : WITHINGS_APPLI_ESSENCIAIS;
  const hasAll = querem.every((a) => confirmed.includes(a));
  return hasAll ? "receiving" : "partial";
}

/** Which kinds Withings has not agreed to send. Empty when all of them did. */
export function missingKinds(connection: {
  notifyConfirmedAppli?: number[] | null;
}): number[] {
  const confirmed = connection.notifyConfirmedAppli ?? [];
  /* Os essenciais — pela mesma razão do `deliveryState`, acima. */
  return WITHINGS_APPLI_ESSENCIAIS.filter((a) => !confirmed.includes(a));
}

/** Whether blood pressure specifically is not coming — the one that matters here. */
export function bloodPressureMissing(connection: {
  notifyConfirmedAppli?: number[] | null;
  notifyCheckedAt?: Date | null;
}): boolean {
  if (!connection.notifyCheckedAt) return false; // unknown is not "missing"
  return !(connection.notifyConfirmedAppli ?? []).includes(WITHINGS_APPLI.BLOOD_PRESSURE);
}
