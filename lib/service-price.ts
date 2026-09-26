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
export async function patientBookingPrice(clinicId: string): Promise<number | null> {
  const prices = await servicePricesForClinic(clinicId);
  const consultation = prices.find((p) => p.serviceType === "CONSULTATION");
  if (consultation) return consultation.price;
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } });
  return isPersonalTenant(clinic?.type) ? 0 : null;
}

/**
 * O que a clínica precificou, do ponto de vista de quem administra — inclusive
 * as linhas desligadas, que é justamente o que a tela precisa mostrar para o
 * interruptor deixar de ser invisível.
 */
export async function servicePricesForAdmin(clinicId: string | null) {
  if (!clinicId) return [];
  const own = await prisma.servicePrice.findMany({ where: { clinicId }, orderBy: { serviceType: "asc" } });
  const priced = new Set(own.map((p) => p.serviceType));
  const defaults = await prisma.servicePrice.findMany({ where: { clinicId: null }, orderBy: { serviceType: "asc" } });
  return [...own, ...defaults.filter((p) => !priced.has(p.serviceType))];
}
