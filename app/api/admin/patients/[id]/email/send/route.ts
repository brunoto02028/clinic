export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { guardEmailAccess } from "@/lib/patient-email-server";
import { parseEmailInput, renderPatientEmail } from "@/lib/patient-email";

const MAX_PER_HOUR = 5;

// POST — send the e-mail that was previewed. Only ever called by an explicit
// staff click; the previewed hash has to match what is rendered now.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guardEmailAccess(request, params.id);
    if (g.response) return g.response;
    if (!g.patient.email) return NextResponse.json({ error: "This patient has no e-mail address on file" }, { status: 400 });

    const body = await request.json().catch(() => null);
    const parsed = parseEmailInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (typeof body.hash !== "string" || !body.hash) {
      return NextResponse.json({ error: "Preview the e-mail first" }, { status: 400 });
    }

    const email = await renderPatientEmail(g.patient, parsed.data);
    if (email.hash !== body.hash) {
      return NextResponse.json({ error: "The e-mail changed after the preview — preview it again before sending", code: "PREVIEW_MISMATCH" }, { status: 409 });
    }

    const recent = await prisma.patientOutboundEmail.count({
      where: { patientId: params.id, status: "sent", createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= MAX_PER_HOUR) {
      return NextResponse.json({ error: "Too many e-mails to this patient in the last hour" }, { status: 429 });
    }

    // Appointment link is kept only when the appointment really is this patient's.
    let appointmentId: string | null = null;
    if (parsed.data.appointmentId) {
      const appt = await prisma.appointment.findFirst({ where: { id: parsed.data.appointmentId, patientId: params.id }, select: { id: true } });
      appointmentId = appt?.id ?? null;
    }

    const { getAdminNotificationEmail } = await import("@/lib/admin-notify-email");
    const adminBcc = await getAdminNotificationEmail(g.patient.clinicId);
    const result = await sendEmail({
      to: g.patient.email,
      subject: email.subject,
      html: email.html,
      bcc: adminBcc && adminBcc.toLowerCase() !== g.patient.email.toLowerCase() ? adminBcc : undefined,
    });
    const ok = result.success === true;

    const row = await prisma.patientOutboundEmail.create({
      data: {
        clinicId: g.patient.clinicId,
        patientId: params.id,
        sentById: g.actorId,
        appointmentId,
        locale: email.locale,
        bothLanguages: email.bothLanguages,
        subject: email.subject,
        bodyText: email.bodyText,
        html: email.html,
        contentHash: email.hash,
        status: ok ? "sent" : "failed",
        providerError: ok ? null : String((result as any).error || "unknown error").slice(0, 1000),
      },
    });

    if (!ok) return NextResponse.json({ error: "The e-mail could not be sent", id: row.id, status: "failed" }, { status: 502 });
    return NextResponse.json({ id: row.id, status: "sent" }, { status: 201 });
  } catch (error) {
    console.error("[patient-email] send error:", error);
    return NextResponse.json({ error: "Failed to send the e-mail" }, { status: 500 });
  }
}
