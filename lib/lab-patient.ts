import { prisma } from "@/lib/db";
import { HOME_KITS } from "@/lib/lab-catalog";
import { labStage } from "@/lib/lab-stage";
import { nonDiagnosticCopy } from "@/lib/lab-review-mode";

/**
 * O que o paciente pode ver (081, T-3) — e, tão importante, o que não pode.
 *
 * Nenhuma função aqui devolve `costPrice`: a margem é assunto da clínica. E o
 * resultado só sai daqui **depois de liberado**; antes disso não há valores,
 * nem "em breve" que sugira que já existem. A tela do paciente diz "em revisão
 * com o seu terapeuta", e é só.
 */

const porCodigo = new Map(HOME_KITS.map((k) => [k.code, k]));

export function patientProduct(p: {
  id: string; lmlProductId: string; name: string; category: string | null; description: string | null;
  biomarkers: string[]; sampleType: string | null; turnaroundDays: number | null; retailPrice: number; currency: string;
}) {
  const kit = porCodigo.get(p.lmlProductId);
  return {
    id: p.id,
    code: p.lmlProductId,
    name: p.name,
    category: p.category,
    biomarkers: p.biomarkers,
    sampleType: p.sampleType ?? kit?.sampleType ?? "capillary",
    turnaroundDays: p.turnaroundDays ?? kit?.turnaroundDays ?? null,
    price: p.retailPrice,
    currency: p.currency,
    // A descrição do banco, quando a clínica escreveu uma; senão a da lista,
    // em inglês primeiro e português junto.
    description: { en: p.description ?? kit?.descriptionEn ?? "", pt: kit?.descriptionPt ?? p.description ?? "" },
    notUnder16: kit?.notUnder16 ?? false,
  };
}

export function patientOrderInclude() {
  return {
    items: { select: { id: true, productId: true, productName: true, quantity: true, unitPrice: true, total: true } },
    registrations: { select: { id: true, status: true, resultsReady: true, resultsPdfPath: true, assignedPatientAt: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
    events: { select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
  };
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadPatientOrder>>>;

export async function loadPatientOrder(id: string, patientId: string) {
  return prisma.labOrder.findFirst({ where: { id, patientId }, include: patientOrderInclude() });
}

export function patientOrder(o: OrderRow) {
  const stage = labStage(o);
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    stage,
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    // Lista explícita, não `o.items` inteiro: o `select` da consulta já exclui
    // o custo, mas quem chamar isto com uma linha completa não pode vazá-lo.
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    shipping: { name: o.shippingName, address: o.shippingAddress, postcode: o.shippingPostcode },
    registration: o.registrations[0]
      ? { status: o.registrations[0].status, registered: !!o.registrations[0].assignedPatientAt, canRegister: false }
      : null,
    released: !!o.releasedToPatientAt,
    releasedAt: o.releasedToPatientAt,
    reviewMode: o.reviewMode,
    // Eventos internos (RELEASED, erros) não são do paciente; só o ciclo do kit.
    events: o.events.filter((e) => ["CONFIRMED", "KIT_DISPATCHED", "SAMPLE_RECEIVED", "PROCESSING_LAB", "RESULTS_READY", "CANCELLED_LAB"].includes(e.status)),
  };
}

/** O resultado, e só quando liberado. Antes disso a função devolve `null`. */
export async function patientResult(o: OrderRow) {
  // O resultado é da pessoa assim que chega — não há mais liberação pela
  // clínica (26/09/2026). `releasedToPatientAt` segue valendo para os pedidos
  // que já o tinham gravado.
  const liberado = o.status === "RESULTS_READY" || !!o.releasedToPatientAt;
  if (!liberado) return null;
  const values = await prisma.labResultValue.findMany({
    where: { registration: { orderId: o.id } },
    select: { id: true, biomarker: true, value: true, valueText: true, unit: true, minRange: true, maxRange: true, outOfRange: true, measuredAt: true },
    orderBy: { biomarker: "asc" },
  });
  return {
    reviewMode: o.reviewMode,
    releasedAt: o.releasedToPatientAt,
    noteEn: o.releaseNote ?? "",
    notePt: o.releaseNotePt ?? "",
    values,
    pdfAvailable: o.registrations.some((r) => !!r.resultsPdfPath),
    nonDiagnostic: nonDiagnosticCopy(),
  };
}
