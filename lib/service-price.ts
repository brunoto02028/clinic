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

// The price stored on a session a patient books themself — the same figure the
// booking form shows ("Estimated price"), never a number sent by the browser.
// Without a configured consultation price a clinic keeps its historical £60
// default; a personal studio charges nothing through here (its sessions are
// paid in person — activity 52, T-7).
export async function patientBookingPrice(clinicId: string): Promise<number> {
  const prices = await servicePricesForClinic(clinicId);
  const consultation = prices.find((p) => p.serviceType === "CONSULTATION");
  if (consultation) return consultation.price;
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } });
  return isPersonalTenant(clinic?.type) ? 0 : 60;
}
