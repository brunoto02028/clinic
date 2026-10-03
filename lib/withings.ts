import { seal, unseal } from "@/lib/crypto-at-rest";
import { prisma } from "@/lib/db";

/**
 * Withings, spoken to directly.
 *
 * The other six providers go through an aggregator. Withings is here on its
 * own because it is the only one that measures the thing this clinic actually
 * wants a daily series of — blood pressure — and because it has a public
 * OAuth2 API rather than a partner agreement. Same tables as the rest:
 * `WearableConnection` holds the tokens, readings land in the models that
 * already exist for them.
 *
 * Their API is not REST-shaped: every call is a POST with an `action` field,
 * and a 200 can still carry `status != 0`, which is the real error code.
 * `wFetch` turns that into a thrown Error so callers cannot mistake a failure
 * for an empty result.
 *
 * Credentials come from the Withings developer portal
 * (WITHINGS_CLIENT_ID / WITHINGS_CLIENT_SECRET). Without them nothing here
 * runs, and the connect route says so rather than failing silently.
 */
const AUTH_URL = "https://account.withings.com/oauth2_user/authorize2";
const TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2";
const API = "https://wbsapi.withings.net";

/** Blood pressure, weight and body composition, plus sleep and activity. */
export const WITHINGS_SCOPE = "user.metrics,user.activity";

export function withingsConfigured(): boolean {
  return Boolean(process.env.WITHINGS_CLIENT_ID && process.env.WITHINGS_CLIENT_SECRET);
}

function creds() {
  const clientId = process.env.WITHINGS_CLIENT_ID;
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Withings is not configured");
  return { clientId, clientSecret };
}

export function withingsAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = creds();
  const q = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: WITHINGS_SCOPE,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${q.toString()}`;
}

async function wFetch(url: string, body: Record<string, string>): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`Withings HTTP ${res.status}`);
  const json = await res.json();
  // A 200 with status 401 is how they report an expired token. Treating the
  // HTTP code alone as success would record an empty sync as a successful one.
  if (json?.status !== 0) {
    throw new Error(`Withings status ${json?.status}: ${json?.error || "unknown"}`);
  }
  return json.body;
}

/**
 * One authenticated call to their API, for the readers that live in their own
 * file (lib/withings-vitals.ts). Same contract as everything else here: a 200
 * carrying `status != 0` is a failure and throws.
 */
export async function withingsRawCall(path: string, body: Record<string, string>): Promise<any> {
  return wFetch(`${API}${path}`, body);
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  providerUserId: string;
}

function tokensFrom(body: any): Tokens {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + Number(body.expires_in ?? 3600) * 1000),
    providerUserId: String(body.userid ?? ""),
  };
}

export async function withingsExchangeCode(code: string, redirectUri: string): Promise<Tokens> {
  const { clientId, clientSecret } = creds();
  return tokensFrom(await wFetch(TOKEN_URL, {
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }));
}

async function withingsRefresh(refreshToken: string): Promise<Tokens> {
  const { clientId, clientSecret } = creds();
  return tokensFrom(await wFetch(TOKEN_URL, {
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  }));
}

export async function saveWithingsTokens(connectionId: string, tokens: Tokens): Promise<void> {
  await (prisma as any).wearableConnection.update({
    where: { id: connectionId },
    data: {
      providerUserId: tokens.providerUserId || undefined,
      accessToken: seal(tokens.accessToken),
      refreshToken: seal(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED",
    },
  });
}

/** Quanto tempo uma trava de renovação vale antes de se considerar morta. */
const TRAVA_DO_REFRESH_MS = 30_000;

/**
 * **Em que linha a trava da conta vive.**
 *
 * A trava é da **conta Withings**, e não da ligação — duas ligações da mesma
 * conta renovam contra o mesmo lado de lá. Como a coluna está na linha, escolhe-
 * se uma linha por conta, sempre a mesma: a mais antiga. Determinística é o que
 * importa; qual delas é, não.
 *
 * Sem `providerUserId` (ligações antigas, ou quem chama com um retrato parcial)
 * cai na própria linha — o comportamento anterior, que é melhor do que nenhuma
 * trava.
 */
async function idDaTrava(connection: {
  id: string;
  providerUserId?: string | null;
}): Promise<string> {
  const conta = connection.providerUserId;
  if (!conta) return connection.id;

  const lider = await (prisma as any).wearableConnection
    .findFirst({
      where: { provider: "WITHINGS", providerUserId: conta },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    .catch(() => null);

  return lider?.id ?? connection.id;
}

/** O token ainda serve? Sessenta segundos de folga para a chamada que vem. */
const aindaServe = (accessToken: string | null, expiraEm: Date | null) =>
  Boolean(accessToken) &&
  Boolean(expiraEm) &&
  (expiraEm as Date).getTime() - Date.now() > 60_000;

/**
 * **Um access token que serve, renovando no máximo um processo de cada vez.**
 *
 * ## O defeito que isto fecha (121 T-1)
 *
 * A Withings troca o refresh token a cada uso — é de **uso único**. Esta função
 * recebia um retrato da ligação, renovava e gravava o novo par. Quatro caminhos
 * a chamam: o cron, o webhook, o puxar-a-tela e a sondagem. **Dois ao mesmo
 * tempo fazem dois refreshes com o mesmo token**, e o segundo faz a Withings
 * invalidar a cadeia inteira. Depois disso nenhuma repetição ajuda: só
 * reautorizar.
 *
 * Foi o que matou a ligação do Bruno em ~05/09/2026 — a Activity dele dizia
 * *"27 days without a reading"* — com o log do contentor a repetir
 * `Invalid Params: invalid refresh_token`. O pedido dele foi literal: *"não
 * pode parar de sincronizar jamais"*.
 *
 * ## Como
 *
 * 1. **Relê a ligação do banco**, e não o retrato de quem chamou: outro
 *    processo pode ter renovado há dois segundos, e aí já há token bom.
 * 2. **Toma a trava com um `updateMany` condicional** — a condição e a escrita
 *    numa operação, que é o que torna isto atómico entre contentores. Um `Set`
 *    em memória não vê o outro contentor.
 * 3. **Quem não ganha a trava espera e relê.** Não falha: o vencedor vai
 *    escrever um token bom, e usá-lo é o certo.
 * 4. A trava expira em 30 s, para um processo que morra a meio não trancar a
 *    ligação para sempre.
 */
export async function withingsAccessToken(
  connection: {
    id: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    /**
     * O id da **conta Withings** (`userid` deles), quando quem chama o tem.
     *
     * A trava é por conta e não por ligação — ver `idDaTrava`.
     */
    providerUserId?: string | null;
  },
  /**
   * Quem está a pedir (121 T-5).
   *
   * A T-1 fecha a corrida que eu **consigo explicar**. O que não se sabe é se
   * era a única causa: a ligação esteve morta ~27 dias e a única prova é uma
   * linha a dizer `invalid refresh_token`, sem dizer quem chamou nem quando.
   *
   * Se voltar a parar, isto diz qual caminho estava a renovar. E, antes disso,
   * o número de **esperas** diz se a corrida era mesmo esta: se for zero numa
   * semana, a explicação é outra.
   */
  origem: "cron" | "webhook" | "manual" | "sondagem" | "assinatura" | "desligar" | "?" = "?"
): Promise<string> {
  /* O caminho rápido, sem tocar no banco: o retrato de quem chamou já serve. */
  const doRetrato = unseal(connection.accessToken);
  if (aindaServe(doRetrato, connection.tokenExpiresAt)) return doRetrato as string;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    /*
     * **O estado de agora, e não o de quem chamou.** É esta releitura que faz
     * o segundo processo encontrar o token que o primeiro acabou de gravar.
     */
    const agora = await (prisma as any).wearableConnection.findUnique({
      where: { id: connection.id },
      select: { accessToken: true, refreshToken: true, tokenExpiresAt: true, refreshLockedAt: true },
    });
    if (!agora) throw new Error("Withings connection needs to be reauthorised");

    const atual = unseal(agora.accessToken);
    if (aindaServe(atual, agora.tokenExpiresAt)) return atual as string;

    const refresh = unseal(agora.refreshToken);
    if (!refresh) throw new Error("Withings connection needs to be reauthorised");

    /*
     * **A trava.** O `where` com a condição e o `data` na mesma operação: ou
     * este processo a toma, ou outro já a tinha. `count` é a resposta.
     */
    const limite = new Date(Date.now() - TRAVA_DO_REFRESH_MS);
    /**
     * **A trava é da conta Withings, não da linha.**
     *
     * Medido no log de produção em 03/10/2026, com duas ligações da conta do
     * Bruno — o relógio dele e a braçadeira da clínica:
     *
     * ```
     * [cron/wearables-sync] connections=2 synced=1 withData=1 failed=1
     * [withings/webhook] error: 503: Invalid Params: invalid refresh_token
     * [withings/webhook] error: 601: Same arguments in less than 10 seconds
     * ```
     *
     * O `601` é a própria Withings a dizer *"a mesma chamada com os mesmos
     * argumentos em menos de dez segundos"* — as duas ligações a falar ao mesmo
     * instante. E uma delas leva `invalid refresh_token`.
     *
     * Uma trava por linha não fecha isso: cada ligação toma a sua e as duas
     * renovam na mesma. O cron já serializa por conta para o `601`
     * (`esperarAVezDaConta`), e a renovação tem de ser pela mesma chave.
     *
     * **O que é medido e o que é inferido:** o log mostra duas ligações da mesma
     * conta a chamar ao mesmo tempo, uma a falhar. Que a Withings invalide a
     * cadeia de uma autorização quando outra da mesma conta renova é a
     * explicação que isto assume — e é a T-5 que a confirma ou desmente, pelo
     * número de esperas.
     */
    const alvo = await idDaTrava(connection);
    const { count } = await (prisma as any).wearableConnection.updateMany({
      where: {
        id: alvo,
        OR: [{ refreshLockedAt: null }, { refreshLockedAt: { lt: limite } }],
      },
      data: { refreshLockedAt: new Date() },
    });

    if (count === 0) {
      /*
       * Outro processo está a renovar. Esperar e reler é melhor do que pedir
       * outro token: o refresh dele é de uso único, e pedir seria queimá-lo.
       */
      console.log(
        `[withings/token] ${origem} esperou a trava de ${connection.id} (volta ${tentativa + 1})`
      );
      await new Promise((r) => setTimeout(r, 600));
      continue;
    }

    try {
      console.log(`[withings/token] ${origem} renova ${connection.id}`);
      const tokens = await withingsRefresh(refresh);
      await saveWithingsTokens(connection.id, tokens);
      /*
       * **A renovação que corre bem apaga o estado** (121 T-3). Sem isto, quem
       * reconecta continua a ver *"precisa reconectar"* — e um aviso que fica
       * depois de resolvido mente tanto quanto um que nunca aparece.
       */
      const { limparEstadoDaLigacao } = await import("@/lib/withings-estado-da-ligacao");
      await limparEstadoDaLigacao(connection.id);
      return tokens.accessToken;
    } catch (e) {
      /*
       * **E a que falha marca** — aqui é onde a cadeia invalidada se descobre,
       * em todos os caminhos de uma vez: cron, webhook, puxar-a-tela e sondagem.
       */
      const { registarFalhaDaLigacao } = await import("@/lib/withings-estado-da-ligacao");
      await registarFalhaDaLigacao(connection.id, e);
      throw e;
    } finally {
      await (prisma as any).wearableConnection
        .updateMany({ where: { id: alvo }, data: { refreshLockedAt: null } })
        .catch(() => {});
    }
  }

  /*
   * Três voltas sem token bom e sem conseguir a trava: o outro processo está
   * preso ou falhou. Dizê-lo é melhor do que renovar por cima dele.
   */
  throw new Error("Withings token refresh is busy; try again");
}

export interface WithingsBpReading {
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  measuredAt: Date;
  /**
   * O fuso em que a medição foi feita, como a Withings o manda (120 T-3).
   *
   * Vinha na mesma resposta do `getmeas`, em `group.timezone`, e era
   * **descartado**. O dia da pressão saía de `toISOString()` — UTC —, enquanto
   * desde 02/10 o `VITALS` usa o fuso da própria medição e o sono usa o `date`
   * que eles mandam. A pressão ficou a única série em UTC: uma leitura às 00:30
   * de Londres no verão arquivava no dia anterior, com o sono da mesma noite no
   * dia certo.
   *
   * É um identificador IANA (`"Europe/London"`), e não um offset: o offset muda
   * com a hora de verão e o identificador não.
   */
  timezone: string | null;
  /**
   * Withings' own id for the measure group (`grpid`).
   *
   * The deduplication key. Matching on the timestamp alone was enough while
   * one account meant one patient and one sync path; with the webhook (T-9)
   * the same measure arrives twice, and with a shared clinic cuff (T-14) two
   * different people can be measured in the same second.
   *
   * Null when they did not send one. It used to be synthesised from the
   * timestamp and the values, which on a shared cuff makes two people measured
   * in the same second with the same numbers look like one measurement — and
   * the second one was then dropped with no trace. An absent id is absent.
   */
  measureId: string | null;
}

/** Withings measure types, from their `getmeas` documentation. */
const TYPE_SYSTOLIC = 10;
const TYPE_DIASTOLIC = 9;
const TYPE_HEART_RATE = 11;

/**
 * Blood-pressure measurements since `since`.
 *
 * Withings returns one "measure group" per reading, each holding the separate
 * systolic/diastolic/pulse values with their own power-of-ten exponent — `1275`
 * with `unit: -1` is 127.5. A group without both halves is not a blood
 * pressure reading and is skipped rather than half-recorded.
 */
export async function withingsBloodPressure(
  accessToken: string,
  since: Date,
  until?: Date
): Promise<WithingsBpReading[]> {
  const body = await wFetch(`${API}/measure`, {
    action: "getmeas",
    access_token: accessToken,
    meastypes: [TYPE_SYSTOLIC, TYPE_DIASTOLIC, TYPE_HEART_RATE].join(","),
    category: "1", // real measurements, not user objectives
    startdate: String(Math.floor(since.getTime() / 1000)),
    // A notification names the window it is about; asking for exactly that
    // window keeps the webhook path cheap on an account with years of history.
    enddate: String(Math.floor((until ?? new Date()).getTime() / 1000)),
  });

  const readings: WithingsBpReading[] = [];
  for (const group of body?.measuregrps ?? []) {
    const val = (type: number): number | null => {
      const m = (group.measures ?? []).find((x: any) => x.type === type);
      return m ? m.value * Math.pow(10, m.unit) : null;
    };
    const systolic = val(TYPE_SYSTOLIC);
    const diastolic = val(TYPE_DIASTOLIC);
    if (systolic == null || diastolic == null) continue;
    const heartRate = val(TYPE_HEART_RATE);
    readings.push({
      systolic: Math.round(systolic),
      diastolic: Math.round(diastolic),
      heartRate: heartRate != null ? Math.round(heartRate) : null,
      measuredAt: new Date(Number(group.date) * 1000),
      /* Ver `timezone` na interface: vinha aqui e era jogado fora. */
      timezone: typeof group.timezone === "string" && group.timezone ? group.timezone : null,
      measureId: group.grpid != null ? String(group.grpid) : null,
    });
  }
  return readings;
}

export interface WithingsActivityDay {
  dataDate: string;
  steps: number | null;
  activeCalories: number | null;
  totalCalories: number | null;
  activeMinutes: number | null;
}

export async function withingsActivity(
  accessToken: string,
  since: Date
): Promise<WithingsActivityDay[]> {
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const body = await wFetch(`${API}/v2/measure`, {
    action: "getactivity",
    access_token: accessToken,
    startdateymd: iso(since),
    enddateymd: iso(new Date()),
    data_fields: "steps,calories,totalcalories,moderate,intense",
  });

  return (body?.activities ?? []).map((a: any) => ({
    dataDate: a.date,
    steps: a.steps ?? null,
    activeCalories: a.calories ?? null,
    totalCalories: a.totalcalories ?? null,
    activeMinutes:
      a.moderate != null || a.intense != null
        ? Math.round(((a.moderate ?? 0) + (a.intense ?? 0)) / 60)
        : null,
  }));
}

export interface WithingsSleepNight {
  dataDate: string;
  sleepDuration: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
}

/** Withings reports sleep stages in seconds; this table stores minutes. */
/**
 * O rMSSD da noite: a média do início e do fim, ou o que houver.
 *
 * `null` quando nenhum dos dois veio — e `null` é um buraco, não um zero: uma
 * VFC de 0 ms não é a de ninguém, e puxaria a média do período para baixo sem
 * nada a denunciar.
 */
function mediaDeRmssd(d: any): number | null {
  const valores = [d?.rmssd_start_avg, d?.rmssd_end_avg].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10;
}

export async function withingsSleep(
  accessToken: string,
  since: Date
): Promise<WithingsSleepNight[]> {
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const body = await wFetch(`${API}/v2/sleep`, {
    action: "getsummary",
    access_token: accessToken,
    startdateymd: iso(since),
    enddateymd: iso(new Date()),
    /**
     * **`rmssd_start_avg`, e não `sdnn_1`** (achado do QA comparativo, 02/10).
     *
     * Pedíamos `sdnn_1` — um campo que **não existe** no `v2/sleep getsummary`.
     * A documentação, medida e escrita nesta mesma pasta hoje
     * (`docs/withings-api-2026-10-02.md`), diz-o por extenso: *"Não há `rmssd`,
     * não há `sdnn_1`, não há `sdnn`"*. Os nomes são `rmssd_start_avg` e
     * `rmssd_end_avg`.
     *
     * Consequência: a coluna `hrv` ficou **sempre nula**, e com ela a linha da
     * VFC no relatório, as barras na aba e o alerta de desvio da clínica. A
     * 119 T-9 tirou a VFC da gaveta `BODY` e pôs na `SLEEP` — onde também
     * ninguém escrevia, porque o escritor perguntava pelo nome errado.
     *
     * O app da Withings mostrava **14 ms** no mesmo dia em que o nosso mostrava
     * nada.
     */
    data_fields:
      "deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,hr_average,rr_average,rmssd_start_avg,rmssd_end_avg",
  });

  const mins = (seconds: unknown) =>
    typeof seconds === "number" ? Math.round(seconds / 60) : null;

  return (body?.series ?? []).map((n: any) => {
    const d = n.data ?? {};
    const deep = mins(d.deepsleepduration);
    const light = mins(d.lightsleepduration);
    const rem = mins(d.remsleepduration);
    const awake = mins(d.wakeupduration);
    const asleep = [deep, light, rem].filter((x): x is number => x != null);
    return {
      dataDate: n.date,
      sleepDuration: asleep.length ? asleep.reduce((a, b) => a + b, 0) : null,
      deepMinutes: deep,
      remMinutes: rem,
      lightMinutes: light,
      awakeMinutes: awake,
      /**
       * **A VFC da noite, em rMSSD** — que é o que a coluna diz guardar.
       *
       * A Withings dá dois: `rmssd_start_avg` e `rmssd_end_avg`, documentados
       * como *"Heart rate variability – Start average"* e *"End average"*.
       *
       * Guardamos a **média dos dois**, e isso é um número nosso: a
       * documentação não diz o tamanho das duas janelas, logo a média não
       * ponderada só é a média da noite se elas forem iguais — e isso não está
       * afirmado em lado nenhum. Escolhemo-la porque a unidade de todas as
       * outras métricas deste ficheiro é a noite, e porque usar só um dos dois
       * faria a série saltar conforme a pessoa adormecesse mais cedo ou mais
       * tarde.
       *
       * Medido em 02/10/2026 contra o app deles: `start 15`, `end 14`, a média
       * **14,5**, e o app da Withings mostrava **14 ms** na mesma noite. Qual
       * dos dois ele mostra, ou se arredonda a média, não se sabe.
       *
       * **E se só vier um, usa-se esse** — meia noite medida é melhor do que
       * nenhuma. Mas isso faz a série mudar de origem entre dias sem nada a
       * distinguir, que é a mesma ressalva escrita no `onde-mora-a-metrica.ts`
       * sobre o `restingHr`: *"um número que muda de origem entre dois dias não
       * é bem uma série"*. Fica dito; separá-los exige uma coluna.
       *
       * **Os dois campos são escopo Total (Withings+)**, em teste até ~16/10.
       * Quando caducar, `hrv` volta a `null` para todos — indistinguível de
       * *"não usou o relógio"*. Nada na tela separa ainda os dois casos.
       */
      hrv: mediaDeRmssd(d),
      restingHr: typeof d.hr_average === "number" ? d.hr_average : null,
    };
  });
}

/**
 * Withings notifications ("notify"), so a measurement arrives when it is taken.
 *
 * `appli` is the kind of data: 1 weight, 4 blood pressure, 16 activity,
 * 44 sleep. We subscribe per kind, because Withings does.
 *
 * Their API answers `status: 0` for an already-existing subscription as well
 * as for a new one, so subscribing twice is safe and there is no need to list
 * first — which matters, because the connect flow must not fail over this.
 */
export const WITHINGS_APPLI = { WEIGHT: 1, BLOOD_PRESSURE: 4, ACTIVITY: 16, SLEEP: 44 } as const;

export async function withingsSubscribe(
  accessToken: string,
  callbackUrl: string,
  appli: number
): Promise<void> {
  await wFetch(`${API}/notify`, {
    action: "subscribe",
    access_token: accessToken,
    callbackurl: callbackUrl,
    appli: String(appli),
    comment: "BPR Clinic",
  });
}

export async function withingsRevokeSubscription(
  accessToken: string,
  callbackUrl: string,
  appli: number
): Promise<void> {
  await wFetch(`${API}/notify`, {
    action: "revoke",
    access_token: accessToken,
    callbackurl: callbackUrl,
    appli: String(appli),
  });
}

export async function withingsListSubscriptions(accessToken: string, appli: number): Promise<any[]> {
  const body = await wFetch(`${API}/notify`, {
    action: "list",
    access_token: accessToken,
    appli: String(appli),
  });
  return body?.profiles ?? [];
}

/** The four kinds we ask for, in one place so the check and the subscribe agree. */
export const WITHINGS_APPLI_WE_WANT: number[] = [
  WITHINGS_APPLI.BLOOD_PRESSURE,
  WITHINGS_APPLI.WEIGHT,
  WITHINGS_APPLI.ACTIVITY,
  WITHINGS_APPLI.SLEEP,
];

/**
 * Asks Withings what it has actually agreed to send us.
 *
 * Subscribing is best-effort on purpose — failing it would drop a connection
 * while the patient is standing in front of a redirect — so the answer has to
 * be read back rather than assumed. Until this existed, `withingsListSubscriptions`
 * sat in this file unused and "connected" meant only that the authorisation
 * worked (activity 075, T-10).
 *
 * A kind counts as confirmed only when OUR callback is in their list: their
 * `list` is per account, and another integration's subscription is not ours.
 *
 * Never throws, and says how many of the questions were actually answered.
 * That second number is the difference between "Withings told us it will send
 * nothing" and "we could not reach Withings" — recording both as an empty list
 * would show a perfectly good connection to the patient as silent, as a fact,
 * because their provider had a bad minute.
 */
export async function confirmWithingsSubscriptions(
  accessToken: string,
  callbackUrl: string,
  appliList: number[] = WITHINGS_APPLI_WE_WANT
): Promise<{ confirmed: number[]; answered: number }> {
  const confirmed: number[] = [];
  let answered = 0;
  await Promise.all(
    appliList.map(async (appli) => {
      try {
        const profiles = await withingsListSubscriptions(accessToken, appli);
        answered++;
        const ours = profiles.some(
          (p: any) => typeof p?.callbackurl === "string" && p.callbackurl.replace(/\/$/, "") === callbackUrl.replace(/\/$/, "")
        );
        if (ours) confirmed.push(appli);
      } catch (err: any) {
        console.error(`[withings] subscription check failed appli=${appli}:`, err?.message);
      }
    })
  );
  return { confirmed: confirmed.sort((a, b) => a - b), answered };
}

/** Where Withings should call us. Public, HTTPS, and the same for every clinic. */
export function withingsCallbackUrl(): string {
  const base = process.env.NEXTAUTH_URL || "https://bpr.clinic";
  return `${base.replace(/\/$/, "")}/api/wearables/withings/webhook`;
}
