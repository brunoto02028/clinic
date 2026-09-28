import { prisma } from "@/lib/db";
import { isPersonalTenant } from "@/lib/tenant-type";

type ServiceType = "CONSULTATION" | string;

export interface PatientServicePrice {
  id: string;
  serviceType: ServiceType;
  name: string;
  description: string | null;
  price: number;
  currency: string;
}

const SELECT = { id: true, serviceType: true, name: true, description: true, price: true, currency: true } as const;

// The prices a patient of this tenant sees: the tenant's own rows, then — for
// a clinic only — the platform defaults (clinicId null) for any service type
// the clinic hasn't priced itself. A personal-trainer studio never inherits
// the BPR clinic's prices (activity 52, T-4): its students were being shown
// the clinic's consultation fee.
export async function servicePricesForClinic(clinicId: string | null): Promise<PatientServicePrice[]> {
  if (!clinicId) return [];
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } });
  const own = await prisma.servicePrice.findMany({
    where: { isActive: true, clinicId },
    orderBy: { serviceType: "asc" },
    select: SELECT,
  });
  if (isPersonalTenant(clinic?.type)) return own as PatientServicePrice[];

  const priced = new Set(own.map((p) => p.serviceType));
  const defaults = await prisma.servicePrice.findMany({
    where: { isActive: true, clinicId: null },
    orderBy: { serviceType: "asc" },
    select: SELECT,
  });
  return [...own, ...defaults.filter((p) => !priced.has(p.serviceType))] as PatientServicePrice[];
}

/**
 * Os preços que **este** paciente vê (082).
 *
 * A ordem é uma só, escrita uma vez, e responde à tela e à marcação:
 *
 *     exceção do paciente → preço da clínica → padrão da plataforma → nada
 *
 * Duas implementações da mesma pergunta seriam a tela prometendo um preço e o
 * servidor cobrando outro — foi a N4 da 080, e custou uma rodada de QA.
 *
 * A exceção não se anuncia: o paciente vê um número, não uma negociação.
 */
export async function servicePricesForPatient(
  clinicId: string | null,
  patientId: string
): Promise<PatientServicePrice[]> {
  const base = await servicePricesForClinic(clinicId);
  if (!clinicId) return base;

  const excecoes = await prisma.patientServicePrice.findMany({
    where: { patientId, clinicId },
    select: { id: true, serviceType: true, price: true, currency: true },
  });
  if (excecoes.length === 0) return base;

  const porTipo = new Map(excecoes.map((e) => [e.serviceType as string, e]));
  const substituidos = base.map((p) => {
    const e = porTipo.get(p.serviceType);
    return e ? { ...p, id: e.id, price: e.price, currency: e.currency } : p;
  });

  // Uma exceção para um serviço que a clínica não precificou ainda assim vale:
  // é a clínica dizendo "esta pessoa paga isto", e não precisa de um preço
  // geral para existir.
  const tinha = new Set(base.map((p) => p.serviceType));
  const novos = excecoes
    .filter((e) => !tinha.has(e.serviceType as string))
    .map((e) => ({
      id: e.id,
      serviceType: e.serviceType as string,
      name: String(e.serviceType),
      description: null,
      price: e.price,
      currency: e.currency,
    }));

  return [...substituidos, ...novos];
}

/**
 * O preço da consulta que o paciente marca sozinho — a mesma cifra que a tela
 * mostra e a que fica gravada, nunca um número vindo do navegador.
 *
 * `null` quer dizer **a clínica não precificou isto**. Antes, esse caso virava
 * £60 inventados: o Bruno digitou 100 em /admin/service-pricing, deixou o
 * interruptor "Active" desligado, e o app cobrou 60 — um número que ninguém
 * escolheu, sem aviso em lugar nenhum (26/09/2026). Vender por um preço que
 * ninguém decidiu é pior que não vender: quem chama trata o `null`.
 *
 * Estúdio de personal continua em 0 de propósito: as sessões dele são pagas
 * presencialmente (atividade 52, T-7), então zero é uma decisão, não um buraco.
 */
export async function patientBookingPrice(clinicId: string, patientId?: string): Promise<number | null> {
  const prices = patientId
    ? await servicePricesForPatient(clinicId, patientId)
    : await servicePricesForClinic(clinicId);
  const consultation = prices.find((p) => p.serviceType === "CONSULTATION");
  if (consultation) return consultation.price;
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } });
  return isPersonalTenant(clinic?.type) ? 0 : null;
}

