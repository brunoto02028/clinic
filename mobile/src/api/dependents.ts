import { apiFetch } from "./client";

/**
 * Quem o titular cuida — e que, na clínica, é paciente de verdade (091 T-7).
 *
 * Não existe "entrar como dependente": a conta dela não tem senha, o e-mail é
 * sintético num domínio que ninguém entrega, e o login recusa contas geridas.
 * Tudo aqui é lido e escrito por quem responde por ela, e o servidor tira esse
 * responsável da sessão — nenhuma destas funções manda um dono junto.
 */

export interface Dependente {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string | null;
  relationship: string | null;
  /** Calculada no servidor: idade guardada envelhece em silêncio. */
  idade: number;
  menorDeIdade: boolean;
}

export interface DependenteEntrada {
  firstName: string;
  lastName: string;
  /** `YYYY-MM-DD` */
  dateOfBirth: string;
  sex?: string | null;
  relationship?: string | null;
}

export async function fetchDependentes(): Promise<Dependente[]> {
  const r = await apiFetch<{ dependents: Dependente[] }>("/api/mobile/dependents");
  return r.dependents ?? [];
}

export async function criarDependente(d: DependenteEntrada): Promise<Dependente> {
  const r = await apiFetch<{ dependent: Dependente }>("/api/mobile/dependents", {
    method: "POST",
    body: JSON.stringify(d),
  });
  return r.dependent;
}

export async function editarDependente(id: string, d: DependenteEntrada): Promise<Dependente> {
  const r = await apiFetch<{ dependent: Dependente }>(`/api/mobile/dependents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(d),
  });
  return r.dependent;
}

export async function apagarDependente(id: string): Promise<void> {
  await apiFetch(`/api/mobile/dependents/${id}`, { method: "DELETE" });
}
