import { apiFetch } from "./client";

/**
 * `status` only ever said whether the authorisation worked. `delivery` says
 * whether anything is actually coming — the two are different questions, and
 * a device can be authorised and silent (activity 075, T-10).
 *
 *  - `receiving`  Withings confirmed it will send all four kinds
 *  - `partial`    it confirmed some; something is missing
 *  - `silent`     it confirmed none. Authorised, and sending nothing.
 *  - `unchecked`  connected before this existed; nobody has asked yet
 */
export type WearableDelivery = "receiving" | "partial" | "silent" | "unchecked";

export interface WearableConnection {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  /**
   * Quando chegou dado **de facto** (114 T-2).
   *
   * `lastSyncedAt` diz quando falamos com o provedor, e falamos com ele haja ou
   * nao haja medicao. Uma tela que so mostra essa parece saudavel para sempre —
   * foi o que fez o Bruno ver *"ultimo sync: hoje"* com a lista vazia.
   */
  lastReadingAt?: string | null;
  /** Ha quantos dias nao chega nada. `null` quando nunca chegou. */
  daysSilent?: number | null;
  /** Calado alem do limiar da clinica — autorizado, a entregar, e mudo. */
  silent?: boolean;
  /**
   * A pressao desta conta entra pela ligacao da **clinica**, e nao por esta.
   *
   * Acontece quando o mesmo aparelho esta ligado duas vezes. A pessoal fica
   * muda para pressao de proposito, e por isso nunca recebe nada de um medidor
   * que so mede pressao — o silencio dela e desenho, nao defeito.
   */
  pressaoPelaClinica?: boolean;
  createdAt: string;
  delivery?: WearableDelivery;
  /** Se o que falta é justamente a pressão — a medida que esta clínica trata. */
  missingBloodPressure?: boolean;
}

export interface WearableDataPoint {
  id: string;
  dataDate: string;
  dataType: string;
  provider: string;
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
  spo2: number | null;
  steps: number | null;
  activeCalories: number | null;
  activeMinutes: number | null;
  /**
   * O registro de ECG, ja lido pelo servidor (099 T-1).
   *
   * So existe quando `dataType === "ECG"`. A conclusao e a do **aparelho** —
   * nos nao interpretamos tracado, e nao recebemos um.
   */
  ecg?: {
    recordedAt: string | null;
    heartRate: number | null;
    /*
     * `normal` é o `afib: 0` da Withings — **sem sinais de fibrilhação**. Até
     * 02/10/2026 a tradução lia `0` como "sem sinal utilizável" e `1` como
     * "normal", e um ECG com fibrilhação aparecia como ritmo normal na tela.
     */
    conclusao: "normal" | "fibrilacao" | "inconclusivo";
    signalId: string | null;
  } | null;
}

export async function fetchConnections(): Promise<WearableConnection[]> {
  const res = await apiFetch<{ connections: WearableConnection[] }>("/api/wearables/connections");
  return res.connections ?? [];
}

export async function fetchWearableData(days = 7): Promise<WearableDataPoint[]> {
  const res = await apiFetch<{ data: WearableDataPoint[] }>(`/api/wearables/data?days=${days}`);
  return res.data ?? [];
}

/**
 * Um registo de ECG — **um por gravação** (119 T-2).
 *
 * `recordedAt` é um instante em ISO. O dia é de quem mostra: o telemóvel agrupa
 * no fuso da pessoa, o painel no da clínica. Guardar um "dia" no servidor
 * obrigava a escolher um fuso por toda a gente, e a escolha era UTC — um ECG
 * das 00:30 em Londres no verão ficava no dia anterior.
 */
export interface RegistoDeEcg {
  id: string;
  recordedAt: string;
  heartRate: number | null;
  conclusao: "normal" | "fibrilacao" | "inconclusivo";
  /** O caminho até ao sinal na Withings, não o sinal. */
  signalId: string | null;
}

/**
 * O link do PDF daquela gravação, assinado **agora**.
 *
 * Pedido no momento do toque e não junto com a lista: o token vive minutos, e
 * um botão que só funciona se a pessoa for rápida é um botão que ensina a não
 * confiar nele.
 */
export async function linkDoPdfDoEcg(
  id: string
): Promise<{ url: string; temTracado: boolean }> {
  return apiFetch<{ url: string; temTracado: boolean }>(`/api/patient/ecg/${id}/link`);
}

export async function fetchEcgs(days = 30): Promise<RegistoDeEcg[]> {
  const res = await apiFetch<{ ecgRecordings?: RegistoDeEcg[] }>(
    `/api/wearables/data?days=${days}`
  );
  return res.ecgRecordings ?? [];
}

/**
 * O que a sincronia trouxe, e **nao so que ela comecou**.
 *
 * A rota ja devolvia estes numeros; a tela deitava-os fora e dizia *"os seus
 * dados serao atualizados em breve"*. O Bruno: *"quando esta sincronizando, eu
 * preciso saber o tempo, acompanhar."*
 *
 * `bloodPressureRead` e o numero que diagnostica: **quantas leituras a Withings
 * devolveu**, salvas ou nao. Com ele, *"a Withings nao tem nada"* e *"veio, e
 * foi para outro lugar"* deixam de ser a mesma tela muda.
 */
export interface ResultadoDaSincronia {
  ok: boolean;
  message?: string;
  /** Salvas no prontuario desta pessoa. */
  bloodPressure?: number;
  /** Devolvidas pela Withings na janela — salvas ou nao. */
  bloodPressureRead?: number;
  activityDays?: number;
  sleepNights?: number;
  vitalsDays?: number;
  ecgRecords?: number;
}

export async function syncProvider(provider: string) {
  return apiFetch<ResultadoDaSincronia>("/api/wearables/sync", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

/** Asks Withings again to send us measurements. The OAuth is not repeated. */
export async function resubscribeWithings() {
  return apiFetch<{ confirmed: number[]; missing: number[]; delivery: WearableDelivery }>(
    "/api/wearables/resubscribe",
    { method: "POST" }
  );
}

export async function disconnectProvider(provider: string) {
  return apiFetch<{ ok: boolean }>("/api/wearables/disconnect", {
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}

/**
 * `enabled` é se o paciente pode ser convidado a ligar **hoje**.
 *
 * Seis destes sete passavam por um agregador cuja credencial nunca foi
 * configurada: a tela mostrava sete botões "Connect" e seis só podiam falhar.
 * Ficam na lista porque cada um volta no dia em que a API dele estiver
 * providenciada — ligar é este interruptor, aqui e no servidor
 * (`lib/open-wearables.ts`), mais a credencial.
 */
export const OW_PROVIDERS = [
  { key: "oura", name: "Oura Ring", icon: "💍", enabled: false },
  { key: "garmin", name: "Garmin", icon: "⌚", enabled: false },
  { key: "whoop", name: "Whoop", icon: "🏋️", enabled: false },
  { key: "fitbit", name: "Fitbit", icon: "📱", enabled: false },
  { key: "polar", name: "Polar", icon: "❄️", enabled: false },
  { key: "strava", name: "Strava", icon: "🚴", enabled: false },
  { key: "withings", name: "Withings", icon: "🩺", enabled: true },
] as const;

/**
 * The provider's authorisation URL, fetched with the patient's token.
 *
 * `Linking.openURL(API_URL + "/api/wearables/connect/" + key)` was the old
 * route in: a plain browser open, with no Authorization header, against an
 * endpoint that wanted a cookie session. It landed on the web login every
 * time. The URL is asked for here, authenticated, and only then opened.
 */
export async function fetchConnectUrl(provider: string): Promise<string> {
  const res = await apiFetch<{ url: string }>(
    `/api/wearables/connect/${encodeURIComponent(provider)}?format=json`
  );
  if (!res?.url) throw new Error("No authorisation URL returned");
  return res.url;
}

/**
 * Whether the patient has said they read the non-emergency notice
 * (activity 074, T-13). The server refuses to start a device connection
 * without it; the screen asks first so the refusal never has to happen.
 */
export interface MonitoringConsent {
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
}

export async function fetchMonitoringConsent(): Promise<MonitoringConsent> {
  return apiFetch<MonitoringConsent>("/api/patient/monitoring-consent");
}

export async function acceptMonitoringConsent(): Promise<MonitoringConsent> {
  return apiFetch<MonitoringConsent>("/api/patient/monitoring-consent", { method: "POST" });
}

/**
 * As séries do dia e da noite (099 T-8).
 *
 * O `fetchWearableData` acima devolve **um ponto por dia**, que responde "como
 * tem andado". Isto responde "o que aconteceu comigo hoje", que precisa da
 * hora.
 *
 * `bucketMinutes` vem na resposta de propósito: o servidor agrega 1440 pontos
 * para caber no ecrã, e a tela diz em que resolução está a desenhar. Esconder
 * isso seria dizer mais precisão do que existe.
 */
export interface SerieDoDia {
  kind: "INTRADAY" | "HYPNOGRAM" | "WORKOUTS";
  dataDate: string | null;
  provider?: string;
  updatedAt?: string;
  /** Só no intraday: quantos minutos cada ponto agrega. */
  bucketMinutes?: number;
  /** Só no intraday: quantos pontos o servidor tinha antes de agregar. */
  rawPointCount?: number;
  points: any[];
  pointCount: number;
  hasConnection: boolean;
  /** `no_series_for_day` ou `no_connection` — só quando vem vazia. */
  reason?: string;
}

export async function fetchSerie(
  kind: "INTRADAY" | "HYPNOGRAM" | "WORKOUTS",
  date?: string
): Promise<SerieDoDia> {
  const q = date ? `&date=${encodeURIComponent(date)}` : "";
  return apiFetch<SerieDoDia>(`/api/wearables/series?kind=${kind}${q}`);
}

/**
 * As metas diárias — **do paciente** (118 T-7).
 *
 * Um campo a `null` é meta **não definida**, e a tela não desenha progresso
 * nenhum para ele. Não há valor por omissão de propósito: pôr "8.000 passos"
 * seria dar a alguém um alvo que ele não escolheu.
 */
export type { Metas } from "@/lib/metas-formulario";
import type { Metas } from "@/lib/metas-formulario";

export async function fetchMetas(): Promise<Metas> {
  const r = await apiFetch<{ goals: Metas }>("/api/patient/goals");
  return r.goals;
}

export async function salvarMetas(m: Partial<Metas>): Promise<Metas> {
  const r = await apiFetch<{ goals: Metas }>("/api/patient/goals", {
    method: "PUT",
    body: JSON.stringify(m),
  });
  return r.goals;
}
