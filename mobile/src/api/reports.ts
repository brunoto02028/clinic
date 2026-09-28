import { apiFetch } from "./client";

/**
 * Os relatórios de acompanhamento desta pessoa (099 T-5).
 *
 * Ela abre o app e eles estão lá — **isso é ela buscar, não nós enviarmos**.
 * É essa distinção que faz o produto existir sem quebrar a regra de que nada
 * automático chega a um paciente.
 */
export interface RelatorioDoPaciente {
  id: string;
  cadence: "DAILY" | "WEEKLY";
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  therapistNote: string | null;
  /**
   * O link que o navegador do telefone consegue abrir.
   *
   * Assinado e curto: o navegador não carrega o bearer, então a permissão
   * viaja no próprio link — preso a um relatório, a uma pessoa e a cinco
   * minutos.
   */
  url: string;
}

export async function fetchRelatorios(): Promise<RelatorioDoPaciente[]> {
  const res = await apiFetch<{ reports: RelatorioDoPaciente[] }>("/api/patient/reports");
  return Array.isArray(res?.reports) ? res.reports : [];
}
