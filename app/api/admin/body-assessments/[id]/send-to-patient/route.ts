import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// POST - Send body assessment report to patient
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (!assessment.postureAnalysis && !assessment.aiFindings) {
      return NextResponse.json({ error: "No analysis data to send. Run AI analysis first." }, { status: 400 });
    }

    // Parse language from body
    let language = "en";
    try {
      const body = await request.json();
      language = body.language || "en";
    } catch {}

    // Update assessment status
    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: {
        status: "SENT_TO_PATIENT",
        sentToPatientAt: new Date(),
        reportLanguage: language,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Send email notification to patient
    const isPt = language === "pt-BR";
    const patientName = assessment.patient.firstName || "Patient";
    const therapistName = assessment.therapist
      ? `${assessment.therapist.firstName} ${assessment.therapist.lastName}`
      : "Your Therapist";

    const subject = isPt
      ? `Sua Avaliação Biomecânica está pronta - ${assessment.assessmentNumber}`
      : `Your Biomechanical Assessment is ready - ${assessment.assessmentNumber}`;

    const overallScore = assessment.overallScore ? Math.round(assessment.overallScore) : null;
    const findingsCount = assessment.aiFindings?.length || 0;
    const exercisesCount = assessment.correctiveExercises?.length || 0;

    const htmlContent = isPt
      ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Olá ${patientName},</h2>
          <p>Sua avaliação biomecânica <strong>${assessment.assessmentNumber}</strong> foi finalizada por ${therapistName}.</p>
          ${overallScore ? `<p style="font-size: 18px;">Pontuação Geral: <strong style="color: ${overallScore >= 70 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444'};">${overallScore}/100</strong></p>` : ''}
          <ul>
            <li><strong>${findingsCount}</strong> achados clínicos identificados</li>
            <li><strong>${exercisesCount}</strong> exercícios corretivos prescritos</li>
          </ul>
          <p>Acesse sua área de paciente para ver o relatório completo:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/dashboard/body-assessments" 
               style="background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Ver Avaliação Completa
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">Bruno Physical Rehabilitation</p>
        </div>`
      : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Hello ${patientName},</h2>
          <p>Your biomechanical assessment <strong>${assessment.assessmentNumber}</strong> has been completed by ${therapistName}.</p>
          ${overallScore ? `<p style="font-size: 18px;">Overall Score: <strong style="color: ${overallScore >= 70 ? '#10B981' : overallScore >= 50 ? '#F59E0B' : '#EF4444'};">${overallScore}/100</strong></p>` : ''}
          <ul>
            <li><strong>${findingsCount}</strong> clinical findings identified</li>
            <li><strong>${exercisesCount}</strong> corrective exercises prescribed</li>
          </ul>
          <p>Access your patient portal to view the full report:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/dashboard/body-assessments" 
               style="background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Full Assessment
            </a>
          </p>
          <p style="color: #666; font-size: 12px;">Bruno Physical Rehabilitation</p>
        </div>`;

    try {
      await sendEmail({
        to: assessment.patient.email,
        subject,
        html: htmlContent,
      });
    } catch (emailErr) {
      console.error("Failed to send assessment email:", emailErr);
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error sending assessment to patient:", error);
    return NextResponse.json(
      { error: "Failed to send assessment to patient" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke assessment from patient (remove from their portal)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: {
        sentToPatientAt: null,
        status: "PENDING_REVIEW",
      },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("Error revoking assessment from patient:", error);
    return NextResponse.json(
      { error: "Failed to revoke assessment" },
      { status: 500 }
    );
  }
}
