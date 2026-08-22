import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAIClinical } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const STAFF = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET — latest evidence report for this patient (clinician-internal).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await prisma.clinicalEvidenceReport.findFirst({
    where: { patientId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ report });
}

// PATCH — therapist review actions (status transitions). No SENT_TO_PATIENT here:
// this report is clinician-internal in this phase.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reportId, status } = body as { reportId?: string; status?: string };
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });

  const allowed = ["DRAFT", "UNDER_REVIEW", "APPROVED", "ARCHIVED"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await prisma.clinicalEvidenceReport.findFirst({
    where: { id: reportId, patientId: params.id },
    select: { id: true },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const data: any = { status };
  if (status === "APPROVED") {
    data.approvedAt = new Date();
    data.reviewedById = (session.user as any).id ?? null;
  }

  const updated = await prisma.clinicalEvidenceReport.update({ where: { id: reportId }, data });
  return NextResponse.json({ report: updated });
}

// POST — `action: "translate"` fills narrativePt on demand (T-6); default enqueues
// a fresh GENERATING report from the latest screening (regenerate).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !STAFF.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Translate the AI narrative to PT on demand (idempotent).
  if (body?.action === "translate") {
    const report = await prisma.clinicalEvidenceReport.findFirst({
      where: { id: body.reportId, patientId: params.id },
      select: { id: true, narrativeEn: true, narrativePt: true },
    });
    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    if (report.narrativePt) return NextResponse.json({ report }); // already translated
    if (!report.narrativeEn) return NextResponse.json({ error: "Nothing to translate" }, { status: 400 });

    let pt = "";
    try {
      pt = await callAIClinical(
        `Translate the following physiotherapy evidence summary to Brazilian Portuguese. Keep clinical terminology accurate; do not add or remove content. Return only the translation:\n\n${report.narrativeEn}`,
        { temperature: 0, maxTokens: 2000, model: "claude" },
      );
    } catch (e: any) {
      return NextResponse.json({ error: `Translation failed: ${e?.message || e}` }, { status: 502 });
    }
    const updated = await prisma.clinicalEvidenceReport.update({
      where: { id: report.id },
      data: { narrativePt: pt.trim() },
    });
    return NextResponse.json({ report: updated });
  }

  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: { clinicId: true },
  });
  if (!patient?.clinicId) {
    return NextResponse.json({ error: "Patient has no clinic" }, { status: 400 });
  }

  // Don't stack duplicate generations: if one is already in flight, return it.
  const inFlight = await prisma.clinicalEvidenceReport.findFirst({
    where: { patientId: params.id, status: "GENERATING" },
  });
  if (inFlight) return NextResponse.json({ report: inFlight }, { status: 200 });

  const screening = await prisma.medicalScreening.findUnique({
    where: { userId: params.id },
    select: { id: true },
  });

  const created = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: patient.clinicId,
      patientId: params.id,
      screeningId: screening?.id ?? null,
      status: "GENERATING",
    },
  });

  return NextResponse.json({ report: created }, { status: 201 });
}
