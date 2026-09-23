import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — serves the PDF straight from PatientInvoice.pdfBase64 (activity
// 072), so it stays downloadable even after the delivering EmailMessage is
// gone. A historical (backfilled) invoice has no PDF of its own — see
// scripts/backfill-patient-invoices.js — and returns 404 rather than a
// fabricated document.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const invoice = await prisma.patientInvoice.findFirst({
    where: { id: params.id, clinicId },
    select: { invoiceNumber: true, pdfBase64: true },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!invoice.pdfBase64) {
    return NextResponse.json({ error: "No PDF stored for this invoice (likely an imported historical record) — see its linked e-mail instead." }, { status: 404 });
  }

  const buffer = Buffer.from(invoice.pdfBase64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });
}
