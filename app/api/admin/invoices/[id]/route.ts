import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

async function requireClinic(): Promise<{ clinicId: string; userId: string } | { response: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return { response: NextResponse.json(NO_CLINIC, { status: 403 }) };
  return { clinicId, userId: (session!.user as any).id };
}

// GET — detail: items, linked e-mails (delivery history), patient.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireClinic();
  if ("response" in guard) return guard.response;

  const invoice = await prisma.patientInvoice.findFirst({
    where: { id: params.id, clinicId: guard.clinicId },
    include: {
      items: true,
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      paidBy: { select: { firstName: true, lastName: true } },
      emails: { select: { id: true, folder: true, sentAt: true, toAddress: true, subject: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ invoice });
}

// PATCH — three distinct shapes, disambiguated by which field is present:
//   { items, notes?, dueDate? }  — edit line items, DRAFT only
//   { markPaid: true, paidAmount?, paidMethod? } — manual "mark as paid" (T-5)
//   { markVoid: true }           — cancel an invoice that was never paid
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireClinic();
  if ("response" in guard) return guard.response;

  const invoice = await prisma.patientInvoice.findFirst({ where: { id: params.id, clinicId: guard.clinicId } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (body.markPaid) {
    if (invoice.paidMethod === "stripe") {
      return NextResponse.json({ error: "This invoice was already paid automatically via Stripe" }, { status: 400 });
    }
    // Server-side, not just the UI hiding the button — a DRAFT was never
    // even sent to the patient, and PAID/VOID are already terminal states.
    if (invoice.status !== "SENT" && invoice.status !== "OVERDUE") {
      return NextResponse.json({ error: `Cannot mark a ${invoice.status} invoice as paid — only SENT or OVERDUE.` }, { status: 400 });
    }
    if (body.paidAmount !== undefined && (typeof body.paidAmount !== "number" || body.paidAmount <= 0)) {
      return NextResponse.json({ error: "paidAmount must be a positive number" }, { status: 400 });
    }
    const updated = await prisma.patientInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidAmount: typeof body.paidAmount === "number" ? body.paidAmount : invoice.total,
        paidMethod: typeof body.paidMethod === "string" && body.paidMethod.trim() ? body.paidMethod.trim() : "manual",
        paidById: guard.userId,
      },
    });
    return NextResponse.json({ success: true, invoice: updated });
  }

  if (body.markVoid) {
    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Cannot void an invoice that's already been paid." }, { status: 400 });
    }
    const updated = await prisma.patientInvoice.update({ where: { id: invoice.id }, data: { status: "VOID" } });
    return NextResponse.json({ success: true, invoice: updated });
  }

  if (Array.isArray(body.items)) {
    if (invoice.status !== "DRAFT") {
      return NextResponse.json({ error: "Only a DRAFT invoice's items can be edited — this one was already sent." }, { status: 400 });
    }
    const items = body.items
      .filter((it: any) => it && typeof it.description === "string" && it.description.trim() && typeof it.unitPrice === "number" && it.unitPrice > 0)
      .map((it: any) => ({
        description: it.description.trim(),
        quantity: typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1,
        unitPrice: it.unitPrice,
        total: (typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1) * it.unitPrice,
      }));
    if (items.length === 0) {
      return NextResponse.json({ error: "At least one item with a description and price is required" }, { status: 400 });
    }
    const total = items.reduce((sum: number, it: any) => sum + it.total, 0);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.patientInvoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
      return tx.patientInvoice.update({
        where: { id: invoice.id },
        data: {
          subtotal: total,
          total,
          notes: body.notes !== undefined ? body.notes : invoice.notes,
          dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : invoice.dueDate,
          items: { create: items },
        },
        include: { items: true },
      });
    });
    return NextResponse.json({ success: true, invoice: updated });
  }

  return NextResponse.json({ error: "Nothing to update — pass items, markPaid, or markVoid" }, { status: 400 });
}

// DELETE — only a DRAFT invoice can be deleted outright; a sent one should
// be voided instead (it already reached the patient).
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireClinic();
  if ("response" in guard) return guard.response;

  const invoice = await prisma.patientInvoice.findFirst({ where: { id: params.id, clinicId: guard.clinicId } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status !== "DRAFT") {
    return NextResponse.json({ error: "Only a DRAFT invoice can be deleted — use Void for one that was already sent." }, { status: 400 });
  }

  await prisma.patientInvoice.delete({ where: { id: invoice.id } });
  return NextResponse.json({ success: true });
}
