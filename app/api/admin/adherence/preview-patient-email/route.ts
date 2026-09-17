import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { wrapInLayout } from "@/lib/email-templates";
import { REMINDER_MESSAGE_EN, REMINDER_MESSAGE_PT } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

// GET — renders the exact e-mail a patient would get from notifyPatient()
// when the daily-adherence cron reminds them (the EMAIL-channel fallback;
// WhatsApp/SMS/Telegram send the same plain text through their own
// channel). Preview only — never calls notifyPatient, never sends.
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { firstName: true, preferredLocale: true, clinicId: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const locale = patient.preferredLocale || "en-GB";
  const isPt = locale === "pt-BR" || locale.startsWith("pt");
  const msg = isPt && REMINDER_MESSAGE_PT ? REMINDER_MESSAGE_PT : REMINDER_MESSAGE_EN;
  const bodyHtml = `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">${isPt ? "Olá" : "Hi"} ${patient.firstName},<br><br>${msg}</p>`;
  const html = await wrapInLayout(bodyHtml, msg.slice(0, 100), locale, patient.clinicId);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
