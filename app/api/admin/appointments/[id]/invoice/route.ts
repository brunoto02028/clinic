export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { buildInvoiceHtml, InvoiceData } from "@/lib/invoice-html";

async function buildInvoiceForAppointment(
  appointmentId: string,
  overrideAmount?: number
): Promise<{ invoice: InvoiceData; patientEmail: string | null } | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { firstName: true, lastName: true, email: true } },
      clinic: { select: { id: true, name: true, address: true, city: true, postcode: true, phone: true, email: true } },
    },
  });
  if (!appointment) return null;

  const company = await (prisma as any).companyProfile.findUnique({
    where: { clinicId: appointment.clinicId },
  });

  const addressLines = company
    ? [company.tradAddressLine1 || company.regAddressLine1, company.tradAddressLine2 || company.regAddressLine2, [company.tradAddressCity || company.regAddressCity, company.tradAddressPostcode || company.regAddressPostcode].filter(Boolean).join(", ")].filter(Boolean)
    : [appointment.clinic?.address, [appointment.clinic?.city, appointment.clinic?.postcode].filter(Boolean).join(", ")].filter(Boolean);

  const amount = overrideAmount ?? appointment.price;
  const invoiceNumber = `BPR-${appointment.dateTime.toISOString().slice(0, 10).replace(/-/g, "")}-${appointment.id.slice(-6).toUpperCase()}`;

  const invoice: InvoiceData = {
    invoiceNumber,
    issueDate: new Date(),
    business: {
      name: company?.companyName || getAppName(),
      tradingName: company?.tradingName || getAppName(),
      addressLines: addressLines as string[],
      email: company?.companyEmail || appointment.clinic?.email || getSenderEmail(),
      phone: company?.companyPhone || appointment.clinic?.phone || null,
      bankName: company?.bankName || null,
      bankAccountName: company?.bankAccountName || null,
      bankSortCode: company?.bankSortCode || null,
      bankAccountNumber: company?.bankAccountNumber || null,
    },
    clientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    clientEmail: appointment.patient.email,
    items: [
      {
        description: `${appointment.treatmentType} — ${appointment.dateTime.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
        quantity: 1,
        unitPrice: amount,
      },
    ],
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  return { invoice, patientEmail: appointment.patient.email };
}

// GET — admin preview of the invoice (opens/prints in browser)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const amountParam = request.nextUrl.searchParams.get("amount");
  const result = await buildInvoiceForAppointment(params.id, amountParam ? parseFloat(amountParam) : undefined);
  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const html = buildInvoiceHtml(result.invoice);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="Invoice-${result.invoice.invoiceNumber}.html"`,
    },
  });
}

// POST — email the invoice to the patient. Body: { amount?: number }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await buildInvoiceForAppointment(params.id, body?.amount ? parseFloat(body.amount) : undefined);
  if (!result) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }
  if (!result.patientEmail) {
    return NextResponse.json({ error: "Patient has no email on file" }, { status: 400 });
  }

  const html = buildInvoiceHtml(result.invoice);
  const total = result.invoice.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#26332B;">
      <p>Dear ${result.invoice.clientName},</p>
      <p>Please find attached your invoice <strong>${result.invoice.invoiceNumber}</strong> for <strong>£${total.toFixed(2)}</strong>.</p>
      <p>You can pay by cash at your appointment, or by bank transfer using the details in the attached invoice.</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>Kind regards,<br>${result.invoice.business.tradingName}</p>
    </div>
  `;

  await sendEmail({
    to: result.patientEmail,
    subject: `Invoice ${result.invoice.invoiceNumber} — ${result.invoice.business.tradingName}`,
    html: emailBody,
    from: `${result.invoice.business.tradingName} <${getSenderEmail()}>`,
    attachments: [
      {
        filename: `Invoice-${result.invoice.invoiceNumber}.html`,
        content: Buffer.from(html, "utf-8"),
      },
    ],
  });

  return NextResponse.json({ success: true, invoiceNumber: result.invoice.invoiceNumber });
}
