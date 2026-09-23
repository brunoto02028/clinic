import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sessionClinicId, NO_CLINIC } from "@/lib/session-clinic";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — list this clinic's PatientInvoice rows, filtered by patient/status/
// period/invoiceNumber (activity 072). Never returns another clinic's rows
// — same isolation discipline as every other /api/admin/** route this
// session hardened (070/071).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clinicId = await sessionClinicId(session);
  if (!clinicId) return NextResponse.json(NO_CLINIC, { status: 403 });

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId") || undefined;
  const status = searchParams.get("status") || undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

  const where: any = { clinicId };
  if (patientId) where.patientId = patientId;
  if (status === "OVERDUE") {
    // Never persisted — OVERDUE is SENT + a dueDate already in the past,
    // computed the same way the UI's effectiveStatus() badge does. A
    // literal `where.status = "OVERDUE"` always matched zero rows and
    // made this filter silently return nothing (caught in QA).
    where.status = "SENT";
    where.dueDate = { lt: new Date() };
  } else if (status) {
    where.status = status;
  }
  if (dateFrom || dateTo) {
    where.issueDate = {};
    if (dateFrom) where.issueDate.gte = new Date(dateFrom);
    if (dateTo) where.issueDate.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { patient: { firstName: { contains: search, mode: "insensitive" } } },
      { patient: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.patientInvoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
        paidMethod: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.patientInvoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, limit });
}
