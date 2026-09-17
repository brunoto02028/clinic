import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getOnboardingPending, buildOnboardingReminderEmail } from "@/lib/onboarding-reminder";

export const dynamic = "force-dynamic";

// GET — renders the onboarding reminder e-mail (profile/screening/consent
// still pending) without sending it. Preview only.
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

  const pending = await getOnboardingPending(patientId);
  const html = await buildOnboardingReminderEmail(patient.firstName || "", pending, patient.preferredLocale || "en-GB", patient.clinicId);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
