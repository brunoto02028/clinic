import { prisma } from "@/lib/db";
import { InvoiceData } from "@/lib/invoice-html";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";
import { createPatientInvoice } from "@/lib/create-patient-invoice";

/** Builds and persists (activity 072) the PatientInvoice + InvoiceData for
 * one billing period of a recurring PatientSubscription (activity 41) — no
 * Appointment involved. Always DRAFT/manual: the cron that calls this
 * already filters to `stripeSubscriptionId: null` (see
 * app/api/cron/membership-invoices/route.ts) — a Stripe-managed
 * subscription never reaches this function, Stripe handles its own
 * invoicing for those. */
export async function buildInvoiceForSubscription(
  subscriptionId: string
): Promise<{ invoice: InvoiceData; patientEmail: string | null; patientId: string; clinicId: string; patientInvoiceId: string } | null> {
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
  const items = [
    {
      description: `${subscription.plan.name} — ${periodLabel}`,
      quantity: 1,
      unitPrice: subscription.plan.price,
    },
  ];

  const patientInvoice = await createPatientInvoice({
    clinicId: subscription.clinicId,
    patientId: subscription.patient.id,
    items,
    patientSubscriptionId: subscription.id,
    createdById: null, // cron-generated, unattended
  });

  const invoice: InvoiceData = {
    invoiceNumber: patientInvoice.invoiceNumber,
    issueDate: patientInvoice.issueDate,
    business,
    clientName: `${subscription.patient.firstName} ${subscription.patient.lastName}`,
    clientEmail: subscription.patient.email,
    items,
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  return {
    invoice,
    patientEmail: subscription.patient.email,
    patientId: subscription.patient.id,
    clinicId: subscription.clinicId,
    patientInvoiceId: patientInvoice.id,
  };
}
