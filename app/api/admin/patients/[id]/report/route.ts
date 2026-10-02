import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getPatientReportData, renderPatientReportHTML } from "@/lib/patient-report";
import { sendEmail } from "@/lib/email";
import { notifyPatient } from "@/lib/notify-patient";
import { staffPatientAccess } from "@/lib/staff-patient-access";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// ─── GET — Render the full clinical report as a print-ready HTML page ───
// Open in a new tab → browser Print → "Save as PDF" to download.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantAccess = await staffPatientAccess(req, params.id);
  if (tenantAccess.response) return tenantAccess.response;

  const session = await getServerSession(authOptions);
  if (!session?.user || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // O periodo vem da aba de monitoramento, que ja tem a janela escolhida (099
  // T-3). Sem ele, trinta dias — o mesmo padrao das telas.
  const days = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30, 7),
    365
  );
  const data = await getPatientReportData(params.id, { days });
  if (!data.patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const html = renderPatientReportHTML(data);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ─── POST — Email the full report to the patient ───
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantAccess = await staffPatientAccess(req, params.id);
    if (tenantAccess.response) return tenantAccess.response;

    const session = await getServerSession(authOptions);
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getPatientReportData(params.id);
    if (!data.patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    const patient: any = data.patient;
    if (!patient.email) {
      return NextResponse.json({ error: "Patient has no email address on file" }, { status: 400 });
    }

    /*
     * **Este vai para o paciente, logo é na língua dele.** O `GET` acima fica
     * como está: lá quem lê é a clínica, a trabalhar em inglês, e um relatório
     * que muda de língua consoante o paciente tornaria o painel inconsistente
     * para quem o usa o dia inteiro.
     */
    const html = renderPatientReportHTML(data, {
      forEmail: true,
      idioma: (data.patient as any)?.reportLanguage === "pt" ? "pt" : "en",
    });

    const emailResult = await sendEmail({
      to: patient.email,
      subject: `Your Clinical Report — Bruno Physical Rehabilitation`,
      html,
    });

    // Also ping via the patient's preferred channel (WhatsApp/Telegram/SMS)
    await notifyPatient({
      patientId: params.id,
      plainMessage: `Hi ${patient.firstName}, your full clinical report from Bruno Physical Rehabilitation has been sent to your email (${patient.email}).`,
      plainMessagePt: `Olá ${patient.firstName}, o seu relatório clínico completo da Bruno Physical Rehabilitation foi enviado para o seu email (${patient.email}).`,
    }).catch(() => null);

    return NextResponse.json({ success: true, sentTo: patient.email, emailResult });
  } catch (err: any) {
    console.error("[patient-report] send error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
