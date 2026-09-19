import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getExpectedToday } from "@/lib/patient-daily-adherence";
import { buildPatientReminderEmail } from "@/lib/daily-adherence-email";
import { getReminderTemplates } from "@/lib/reminder-templates";

export const dynamic = "force-dynamic";

// GET — renders the exact e-mail a patient would get from notifyPatient()
// when the daily-adherence cron reminds them (the EMAIL-channel fallback;
// WhatsApp/SMS/Telegram send the same plain text through their own
// channel). Preview only — never calls notifyPatient, never sends.
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  const locale = req.nextUrl.searchParams.get("locale");
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  if (locale !== null && locale !== "en" && locale !== "pt") {
    return NextResponse.json({ error: "locale must be 'en' or 'pt'" }, { status: 400 });
  }

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { firstName: true, preferredLocale: true, clinicId: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const { expected, completed } = await getExpectedToday(patientId, new Date());
  const missingTitles = expected.filter((e) => !completed.some((c) => c.id === e.id)).map((e) => e.title);

  const effectiveLocale = locale ? (locale === "pt" ? "pt-BR" : "en-GB") : (patient.preferredLocale || "en-GB");
  const templates = await getReminderTemplates(patient.clinicId);
  const custom = effectiveLocale === "pt-BR" ? templates.today?.pt : templates.today?.en;
  const html = await buildPatientReminderEmail(patient.firstName || "", missingTitles, effectiveLocale, patient.clinicId, custom);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
