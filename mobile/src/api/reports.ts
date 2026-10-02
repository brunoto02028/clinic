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
  /** `ON_DEMAND` é o que o próprio paciente pediu (118 T-5). */
  cadence: "DAILY" | "WEEKLY" | "ON_DEMAND";
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

/**
 * O paciente pede um relatório dele, agora (118 T-5).
 *
 * > *"Quero poder gerar esses reports detalhados que servirão para os pacientes
 * > buscarem ajuda médica ou de outros profissionais quando quiserem."* — Bruno
 *
 * A trava é do servidor — `mod_records`, o mesmo módulo da lista. Esconder o
 * botão não fecha a porta, e esta tela já vive dentro de um `PlanGate` que diz
 * **porquê** quando está desligado.
 *
 * `reaproveitado` vem `true` quando o servidor devolveu o último em vez de
 * gerar outro — há um tecto de dez minutos, porque gerar são nove consultas
 * pesadas ao banco.
 */
export async function pedirRelatorio(
  days?: number
): Promise<{ id: string; url: string; reaproveitado: boolean }> {
  return apiFetch<{ id: string; url: string; reaproveitado: boolean }>("/api/patient/reports", {
    method: "POST",
    body: JSON.stringify(days ? { days } : {}),
  });
}
