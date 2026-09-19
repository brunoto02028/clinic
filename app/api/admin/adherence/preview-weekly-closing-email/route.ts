import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { wrapInLayout } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/admin-notify-email";
import { buildWeeklyClosingText } from "@/lib/weekly-closing";

export const dynamic = "force-dynamic";

// GET — renders the weekly closing e-mail for one patient/language, without
// sending it. Same wrapInLayout wrap the actual send's notifyPatient
// fallback would use — the channel that really goes out on send is
// whichever the patient prefers (WhatsApp/SMS/email), but this preview is a
// text reference regardless of channel.
export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get("patientId");
  const locale = req.nextUrl.searchParams.get("locale");
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  if (locale !== "en" && locale !== "pt") {
    return NextResponse.json({ error: "locale must be 'en' or 'pt'" }, { status: 400 });
  }

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { firstName: true, clinicId: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const text = buildWeeklyClosingText(patient.firstName || "", locale);
  const paragraphs = escapeHtml(text)
    .split("\n\n")
    .map((p) => `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${p}</p>`)
    .join("");
  const html = await wrapInLayout(
    paragraphs,
    text.slice(0, 100),
    locale === "pt" ? "pt-BR" : "en-GB",
    patient.clinicId
  );
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
