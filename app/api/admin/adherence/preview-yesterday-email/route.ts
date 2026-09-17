import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getExpectedToday } from "@/lib/patient-daily-adherence";
import { buildYesterdayFollowupEmail } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

// GET — renders the "yesterday you missed X, Y, Z" follow-up e-mail for one
// patient, without sending it. Same buildYesterdayFollowupEmail the actual
// send (send-yesterday-followup) uses via notifyPatient.
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { firstName: true, preferredLocale: true, clinicId: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { expected, completed } = await getExpectedToday(patientId, yesterday);
  const missing = expected.filter((e) => !completed.some((c) => c.id === e.id)).map((e) => e.title);

  const html = await buildYesterdayFollowupEmail(patient.firstName || "", missing, patient.preferredLocale || "en-GB", patient.clinicId);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
