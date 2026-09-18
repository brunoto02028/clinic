export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { InvoiceData, InvoiceItem } from "@/lib/invoice-html";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";
import { queueInvoiceForApproval } from "@/lib/invoice-pending";
import { staffPatientAccess } from "@/lib/staff-patient-access";

// Standalone invoice generator — not tied to any appointment (activity 40).
// The admin types the line items directly (e.g. a monthly package agreed
// verbally). Body: { items: { description: string; unitPrice: number; quantity?: number }[] }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Every other /api/admin/patients/[id]/** route starts here; this one didn't,
  // so staff of any tenant could queue an invoice against another tenant's
  // patient (activity 52, T-6).
  const guard = await staffPatientAccess(request, params.id);
  if (guard.response) return guard.response;

  const body = await request.json().catch(() => ({}));
  const items: InvoiceItem[] = Array.isArray(body?.items)
    ? body.items
        .filter((it: any) => it && typeof it.description === "string" && it.description.trim() && typeof it.unitPrice === "number" && it.unitPrice > 0)
        .map((it: any) => ({ description: it.description.trim(), unitPrice: it.unitPrice, quantity: it.quantity || 1 }))
    : [];

  if (items.length === 0) {
    return NextResponse.json({ error: "At least one item with a description and price is required" }, { status: 400 });
  }

  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, firstName: true, lastName: true, email: true, clinicId: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }
  if (!patient.email) {
    return NextResponse.json({ error: "Patient has no email on file" }, { status: 400 });
  }
  if (!patient.clinicId) {
    return NextResponse.json({ error: "Patient has no clinic assigned" }, { status: 400 });
  }

  const business = await getInvoiceBusinessInfo(patient.clinicId);
  const today = new Date();
  const invoiceNumber = `BPR-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${patient.id.slice(-6).toUpperCase()}`;

  const invoice: InvoiceData = {
    invoiceNumber,
    issueDate: today,
    business,
    clientName: `${patient.firstName} ${patient.lastName}`,
    clientEmail: patient.email,
    items,
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  const queued = await queueInvoiceForApproval({
    invoice,
    patientEmail: patient.email,
    patientId: patient.id,
    clinicId: patient.clinicId,
  });

  return NextResponse.json({ success: true, ...queued });
}
