import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";
import { buildInvoiceDataForInvoice } from "@/lib/patient-invoice-pdf";
import { queueInvoiceForApproval } from "@/lib/invoice-pending";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// POST — (re)send for approval (activity 072 follow-up). Covers two cases
// with the same code path:
//   - a DRAFT with no PENDING_APPROVAL e-mail right now (its previous one
//     was superseded by an item edit — see the PATCH handler, which
//     discards the stale pending e-mail rather than letting it go out of
//     sync with the items it's supposed to match)
//   - "Resend" on an invoice that already went out once (SENT/OVERDUE/
//     PARTIALLY_PAID) — same content, fresh e-mail, still has to go
//     through the same approval queue as every other financial e-mail.
// Never allowed on VOID (nothing to send) or PAID (already settled).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const invoice = await prisma.patientInvoice.findFirst({ where: { id: params.id, clinicId } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invoice.status === "VOID" || invoice.status === "PAID") {
    return NextResponse.json({ error: `Cannot queue a ${invoice.status} invoice for sending.` }, { status: 400 });
  }

  const { data, patientEmail } = await buildInvoiceDataForInvoice(invoice.id);
  if (!patientEmail) {
    return NextResponse.json({ error: "Patient has no e-mail on file" }, { status: 400 });
  }

  // Discard-old + create-new run inside one transaction, with the
  // PatientInvoice row locked for its duration (SELECT ... FOR UPDATE) —
  // closes the race where two near-simultaneous "Resend" clicks (double
  // click, two tabs) each pass the status check above and each end up
  // creating their own PENDING_APPROVAL e-mail. Whichever request gets the
  // lock second sees the first one's discard-then-create as already done
  // and simply supersedes it in turn — the invoice always ends up with
  // exactly one pending e-mail, never two (caught in code review).
  const queued = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "PatientInvoice" WHERE id = ${invoice.id} FOR UPDATE`;
    await tx.emailMessage.updateMany({
      where: { patientInvoiceId: invoice.id, folder: "PENDING_APPROVAL" },
      data: { folder: "TRASH" },
    });
    return queueInvoiceForApproval({
      invoice: data,
      patientEmail,
      patientId: invoice.patientId,
      clinicId: invoice.clinicId,
      patientInvoiceId: invoice.id,
      db: tx,
    });
  });

  return NextResponse.json({ success: true, ...queued });
}
