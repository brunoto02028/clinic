export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildInvoiceHtml, InvoiceData } from "@/lib/invoice-html";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";
import { queueInvoiceForApproval } from "@/lib/invoice-pending";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { createPatientInvoice } from "@/lib/create-patient-invoice";

// The invoice carries the patient's details and the clinic's bank details, so
// it is only reachable from the appointment's own tenant (activity 52, T-6).
async function staffOfAppointmentTenant(request: NextRequest, appointmentId: string) {
  const actor = await getSessionStaffActor(request);
  if (!actor || !actor.clinicId) return null;
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinicId: actor.clinicId },
    select: { id: true },
  });
  return appt ? actor : null;
}

interface ExtraItem {
  description: string;
  unitPrice: number;
  quantity?: number;
}

// Item list + who it's for — shared by the GET preview (cosmetic only,
// nothing persisted) and the POST that actually creates the structured
// PatientInvoice (activity 072). Also surfaces the appointment's own Payment
// so POST can tell whether this was already settled via Stripe.
async function buildInvoiceForAppointment(
  appointmentId: string,
  overrideAmount?: number,
  extraItems?: ExtraItem[]
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      payment: { select: { status: true, amount: true, updatedAt: true, stripePaymentId: true } },
    },
  });
  if (!appointment) return null;

  const business = await getInvoiceBusinessInfo(appointment.clinicId);
  const amount = overrideAmount ?? appointment.price;

  const items = [
    {
      description: `${appointment.treatmentType} — ${appointment.dateTime.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      quantity: 1,
      unitPrice: amount,
    },
    ...(extraItems || []).map((it) => ({
      description: it.description,
      quantity: it.quantity || 1,
      unitPrice: it.unitPrice,
    })),
  ];

  return {
    items,
    business,
    clientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    patientEmail: appointment.patient.email,
    patientId: appointment.patient.id,
    clinicId: appointment.clinicId,
    // Only offered as "already paid via Stripe" when there's no override/
    // extra items AND the amount being invoiced still matches what Stripe
    // actually settled — Appointment.price can be edited at any time
    // (app/api/appointments/[id]/route.ts), even after a successful
    // payment, so without this check an admin correcting the price after
    // the fact could produce an invoice marked "paid" for more (or less)
    // than what was really charged. Caught in code review.
    stripePayment:
      !overrideAmount && !extraItems?.length && appointment.payment?.status === "SUCCEEDED" && appointment.payment.amount === amount
        ? { amount: appointment.payment.amount, paidAt: appointment.payment.updatedAt, stripePaymentIntentId: appointment.payment.stripePaymentId }
        : null,
  };
}

// GET — admin preview of the invoice (opens/prints in browser)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await staffOfAppointmentTenant(request, params.id))) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const amountParam = request.nextUrl.searchParams.get("amount");
  const result = await buildInvoiceForAppointment(params.id, amountParam ? parseFloat(amountParam) : undefined);
  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Preview only — nothing persisted, so no real invoiceNumber exists yet.
  // Activity 072: the actual number is assigned by createPatientInvoice()
  // when POST is called, and will differ from this placeholder.
  const invoice: InvoiceData = {
    invoiceNumber: "PREVIEW",
    issueDate: new Date(),
    business: result.business,
    clientName: result.clientName,
    clientEmail: result.patientEmail,
    items: result.items,
    acceptsCash: true,
    acceptsBankTransfer: true,
  };
  const html = buildInvoiceHtml(invoice);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="Invoice-preview.html"`,
    },
  });
}

// POST — queue the invoice for admin approval (activity 39: financial emails
// never send automatically — see specs/039-fila-aprovacao-email-financeiro).
// Body: { amount?: number, extraItems?: { description: string; unitPrice: number; quantity?: number }[] }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await staffOfAppointmentTenant(request, params.id))) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const extraItems: ExtraItem[] | undefined = Array.isArray(body?.extraItems)
    ? body.extraItems
        .filter((it: any) => it && typeof it.description === "string" && typeof it.unitPrice === "number")
        .map((it: any) => ({ description: it.description, unitPrice: it.unitPrice, quantity: it.quantity }))
    : undefined;
  const result = await buildInvoiceForAppointment(params.id, body?.amount ? parseFloat(body.amount) : undefined, extraItems);
  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!result.patientEmail) {
    return NextResponse.json({ error: "Patient has no email on file" }, { status: 400 });
  }

  // A second invoice for the same appointment used to just create a
  // duplicate (pre-existing, harmless-looking) — now that a Stripe-paid
  // one also writes a FinancialEntry keyed by the Payment's
  // stripePaymentIntentId (@unique), the second attempt collided on that
  // constraint and surfaced as a raw 500 instead of an explanation. Guard
  // explicitly instead (code review, activity 073).
  const existingInvoice = await prisma.patientInvoice.findFirst({
    where: { appointmentId: params.id, status: { not: "VOID" } },
    select: { id: true, invoiceNumber: true },
  });
  if (existingInvoice) {
    return NextResponse.json(
      { error: `This appointment already has an invoice (${existingInvoice.invoiceNumber}) — void it first if you need to generate a new one.` },
      { status: 409 }
    );
  }

  const actor = await getSessionStaffActor(request);

  const patientInvoice = await createPatientInvoice({
    clinicId: result.clinicId,
    patientId: result.patientId,
    items: result.items,
    appointmentId: params.id,
    createdById: actor?.userId || null,
    alreadyPaidViaStripe: result.stripePayment,
  });

  const invoice: InvoiceData = {
    invoiceNumber: patientInvoice.invoiceNumber,
    issueDate: patientInvoice.issueDate,
    business: result.business,
    clientName: result.clientName,
    clientEmail: result.patientEmail,
    items: result.items,
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  const queued = await queueInvoiceForApproval({
    invoice,
    patientEmail: result.patientEmail,
    patientId: result.patientId,
    clinicId: result.clinicId,
    patientInvoiceId: patientInvoice.id,
  });

  return NextResponse.json({ success: true, ...queued, patientInvoiceId: patientInvoice.id, autoPaidViaStripe: !!result.stripePayment });
}
