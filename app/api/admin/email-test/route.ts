import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== "SUPERADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action, patientId, templateSlug } = await request.json();

    // ── ACTION: test_smtp — just verify SMTP works ──
    if (action === "test_smtp") {
      const adminEmail = (session.user as any).email || "brunotoaz@gmail.com";
      const result = await sendEmail({
        to: adminEmail,
        subject: "✅ BPR Rehab — SMTP Test Successful",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#5dc9c0;">SMTP Connection OK ✅</h2>
            <p>This is a test email confirming your SMTP is correctly configured.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}</p>
            <p><strong>Sent to:</strong> ${adminEmail}</p>
          </div>
        `,
      });
      return NextResponse.json({ success: result.success, message: result.success ? `Test email sent to ${adminEmail}` : "SMTP failed", error: (result as any).error });
    }

    // ── ACTION: simulate_signup — simulate full signup email flow ──
    if (action === "simulate_signup") {
      const patient = patientId
        ? await prisma.user.findUnique({ where: { id: patientId }, select: { id: true, email: true, firstName: true, lastName: true } })
        : null;

      const name = patient ? `${patient.firstName} ${patient.lastName}` : "Test Patient";
      const email = patient?.email || (session.user as any).email;

      const sent = await sendTemplatedEmail("WELCOME", email, {
        patientName: name,
        portalUrl: `${process.env.NEXTAUTH_URL || "https://bpr.rehab"}/dashboard`,
        clinicPhone: "",
      }, patient?.id);

      return NextResponse.json({
        success: sent,
        message: sent ? `Welcome email sent to ${email} (BCC to admin)` : "Failed to send",
        to: email,
        template: "WELCOME",
      });
    }

    // ── ACTION: simulate_screening — simulate screening received email ──
    if (action === "simulate_screening") {
      const patient = patientId
        ? await prisma.user.findUnique({ where: { id: patientId }, select: { id: true, email: true, firstName: true } })
        : null;

      const name = patient?.firstName || "Test Patient";
      const email = patient?.email || (session.user as any).email;

      const sent = await sendTemplatedEmail("SCREENING_RECEIVED", email, {
        patientName: name,
        portalUrl: `${process.env.NEXTAUTH_URL || "https://bpr.rehab"}/dashboard/screening`,
      }, patient?.id);

      return NextResponse.json({
        success: sent,
        message: sent ? `Screening email sent to ${email} (BCC to admin)` : "Failed to send",
        to: email,
        template: "SCREENING_RECEIVED",
      });
    }

    // ── ACTION: simulate_template — send any template ──
    if (action === "simulate_template" && templateSlug) {
      const patient = patientId
        ? await prisma.user.findUnique({ where: { id: patientId }, select: { id: true, email: true, firstName: true, lastName: true } })
        : null;

      const name = patient ? `${patient.firstName} ${patient.lastName}` : "Test Patient";
      const email = patient?.email || (session.user as any).email;

      const sent = await sendTemplatedEmail(templateSlug, email, {
        patientName: name,
        portalUrl: `${process.env.NEXTAUTH_URL || "https://bpr.rehab"}/dashboard`,
        appointmentDate: "Monday, 3 March 2026",
        appointmentTime: "14:00",
        therapistName: "Bruno Admin",
        treatmentType: "Initial Assessment",
        duration: "60",
        clinicPhone: "",
      }, patient?.id);

      return NextResponse.json({
        success: sent,
        message: sent ? `${templateSlug} email sent to ${email} (BCC to admin)` : "Failed to send",
        to: email,
        template: templateSlug,
      });
    }

    // ── ACTION: list_patients — list patients for selection ──
    if (action === "list_patients") {
      const patients = await prisma.user.findMany({
        where: { role: "PATIENT" },
        select: { id: true, email: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
        take: 50,
      });
      return NextResponse.json({ patients });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[email-test] Error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
