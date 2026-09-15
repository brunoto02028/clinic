import { prisma } from "@/lib/db";
import { InvoiceData } from "@/lib/invoice-html";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";

/** Builds the InvoiceData for one billing period of a recurring
 * PatientSubscription (activity 41) — no Appointment involved. */
export async function buildInvoiceForSubscription(
  subscriptionId: string
): Promise<{ invoice: InvoiceData; patientEmail: string | null; patientId: string; clinicId: string } | null> {
  const subscription = await (prisma as any).patientSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      plan: { select: { name: true, price: true, interval: true } },
    },
  });
  if (!subscription) return null;

  const business = await getInvoiceBusinessInfo(subscription.clinicId);
  const now = new Date();
  const periodLabel = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const invoiceNumber = `BPR-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${subscription.id.slice(-6).toUpperCase()}`;

  const invoice: InvoiceData = {
    invoiceNumber,
    issueDate: now,
    business,
    clientName: `${subscription.patient.firstName} ${subscription.patient.lastName}`,
    clientEmail: subscription.patient.email,
    items: [
      {
        description: `${subscription.plan.name} — ${periodLabel}`,
        quantity: 1,
        unitPrice: subscription.plan.price,
      },
    ],
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  return {
    invoice,
    patientEmail: subscription.patient.email,
    patientId: subscription.patient.id,
    clinicId: subscription.clinicId,
  };
}
