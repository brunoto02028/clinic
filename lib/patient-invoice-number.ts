import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

// Activity 072 — the ONLY function allowed to mint a new PatientInvoice
// number. Every generation path (manual, Stripe-automatic, cron, future)
// must call this — never format one inline elsewhere, or the "never
// repeats, always sequential" guarantee below breaks silently.
//
// Atomicity: `nextInvoiceSeq: { increment: 1 } }` compiles to a single
// `UPDATE clinics SET "nextInvoiceSeq" = "nextInvoiceSeq" + 1 WHERE id = $1
// RETURNING "nextInvoiceSeq"` — Postgres executes that as one atomic
// statement even without an explicit transaction wrapper, so two calls for
// the same clinic at the same instant can never read-modify-write the same
// starting value. No retry loop needed, unlike a naive
// "count existing rows + 1" approach (which would race).
//
// `db` accepts a `$transaction` callback client — createPatientInvoice()
// passes one so the increment and the PatientInvoice row are committed (or
// rolled back) together, closing the "create fails after the number was
// already consumed" gap a bare separate call would leave (code review).
export async function generateInvoiceNumber(clinicId: string, db: Db = prisma): Promise<string> {
  const clinic = await db.clinic.update({
    where: { id: clinicId },
    data: { nextInvoiceSeq: { increment: 1 } },
    select: { nextInvoiceSeq: true },
  });
  const seq = clinic.nextInvoiceSeq - 1; // increment returns the NEW value; the number for THIS invoice is one before it
  const year = new Date().getFullYear();
  return `BPR-${year}-${String(seq).padStart(6, "0")}`;
}
