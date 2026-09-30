import { apiFetch } from "./client";

/**
 * What this patient's plan includes — the same computation the web reads
 * (`lib/patient-access.ts`), not a second opinion.
 *
 * The web blocks a page before it ever asks for the data; the app asked the
 * API directly and the API did not gate, so the same patient was shown, in the
 * app, records the web had just told them to upgrade for. One source, read by
 * both, is the only way those two stop disagreeing.
 */
/**
 * Um grupo do menu do paciente, **como o servidor o mandou** (112 T-1).
 *
 * Vem na mesma resposta que os modulos de proposito: num segundo pedido, o menu
 * ficaria sem grupos justamente quando a rede esta ruim — e ai a tela fica pior
 * do que era antes de agrupar.
 *
 * Opcional porque um app atualizado pode falar com um servidor antigo. Sem
 * grupos, o menu volta a ser a lista unica: mais dificil de ler, e sem perder
 * **nenhuma** linha. Perder linha e o unico desfecho inaceitavel aqui.
 */
export interface GrupoDoMenu {
  key: string;
  en: string;
  pt: string;
  modulos: string[];
}

export interface PatientAccess {
  modules: string[];
  hiddenModules: string[];
  permissions: string[];
  fullAccessOverride?: boolean;
  /** The same two answers the web gates its portal on. The app asked a
   *  different question — `screening.consentGiven` — so the two surfaces could
   *  disagree about whether this patient has consented. */
  onboarding: { screeningComplete: boolean; consentAccepted: boolean };
  /** Ausente quando o servidor nao os manda, ou manda algo que nao da para ler. */
  grupos?: GrupoDoMenu[];
}

/**
 * Le os grupos com desconfianca, e devolve `undefined` no menor sinal de defeito.
 *
 * Um grupo meio lido seria pior que nenhum: as linhas dele cairiam no bloco sem
 * cabecalho, e o menu ficaria metade arrumado sem ninguem saber porque.
 */
function gruposValidos(cru: any): GrupoDoMenu[] | undefined {
  if (!Array.isArray(cru) || cru.length === 0) return undefined;
  const bons = cru.filter(
    (g) =>
      g &&
      typeof g.key === "string" &&
      typeof g.en === "string" &&
      typeof g.pt === "string" &&
      Array.isArray(g.modulos)
  );
  if (bons.length !== cru.length) return undefined;
  return bons.map((g) => ({
    key: g.key,
    en: g.en,
    pt: g.pt,
    modulos: g.modulos.filter((m: any) => typeof m === "string"),
  }));
}

export async function fetchAccess(): Promise<PatientAccess> {
  const res = await apiFetch<PatientAccess>("/api/patient/access");
  // A malformed answer is not "this patient has no modules". `modules: []` was
  // the fallback, and PlanGate reads an empty list as a definite refusal — so a
  // backend restart, a timeout or an HTML error page locked eleven screens on a
  // patient with full access and told them their plan did not include their own
  // record. Throwing instead lets the query fail, and PlanGate keeps the last
  // answer it had.
  if (!Array.isArray(res?.modules)) {
    throw new Error("Malformed access response");
  }
  return {
    modules: res.modules,
    hiddenModules: Array.isArray(res?.hiddenModules) ? res.hiddenModules : [],
    permissions: Array.isArray(res?.permissions) ? res.permissions : [],
    fullAccessOverride: res?.fullAccessOverride,
    onboarding: {
      screeningComplete: res?.onboarding?.screeningComplete === true,
      consentAccepted: res?.onboarding?.consentAccepted === true,
    },
    grupos: gruposValidos((res as any)?.grupos),
  };
}
