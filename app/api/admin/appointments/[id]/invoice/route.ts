export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { buildInvoiceHtml, InvoiceData } from "@/lib/invoice-html";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";
import { queueInvoiceForApproval } from "@/lib/invoice-pending";

interface ExtraItem {
  description: string;
  unitPrice: number;
  quantity?: number;
}

async function buildInvoiceForAppointment(
  appointmentId: string,
  overrideAmount?: number,
  extraItems?: ExtraItem[]
): Promise<{ invoice: InvoiceData; patientEmail: string | null; patientId: string | null; clinicId: string | null } | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!appointment) return null;

  const business = await getInvoiceBusinessInfo(appointment.clinicId);
  const amount = overrideAmount ?? appointment.price;
  const invoiceNumber = `BPR-${appointment.dateTime.toISOString().slice(0, 10).replace(/-/g, "")}-${appointment.id.slice(-6).toUpperCase()}`;

  const invoice: InvoiceData = {
    invoiceNumber,
    issueDate: new Date(),
    business,
    clientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    clientEmail: appointment.patient.email,
    items: [
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
    ],
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  return { invoice, patientEmail: appointment.patient.email, patientId: appointment.patient.id, clinicId: appointment.clinicId };
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

// POST — queue the invoice for admin approval (activity 39: financial emails
// never send automatically — see specs/039-fila-aprovacao-email-financeiro).
// Body: { amount?: number, extraItems?: { description: string; unitPrice: number; quantity?: number }[] }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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

  const queued = await queueInvoiceForApproval({
    invoice: result.invoice,
    patientEmail: result.patientEmail,
    patientId: result.patientId,
    clinicId: result.clinicId,
  });

  return NextResponse.json({ success: true, ...queued });
}
