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
export interface PatientAccess {
  modules: string[];
  hiddenModules: string[];
  permissions: string[];
  fullAccessOverride?: boolean;
}

export async function fetchAccess(): Promise<PatientAccess> {
  const res = await apiFetch<PatientAccess>("/api/patient/access");
  return {
    modules: Array.isArray(res?.modules) ? res.modules : [],
    hiddenModules: Array.isArray(res?.hiddenModules) ? res.hiddenModules : [],
    permissions: Array.isArray(res?.permissions) ? res.permissions : [],
    fullAccessOverride: res?.fullAccessOverride,
  };
}
