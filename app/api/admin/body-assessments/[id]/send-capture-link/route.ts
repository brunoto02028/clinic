import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { language = "pt-BR" } = body;

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true },
        },
        clinic: {
          select: { name: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Ensure capture token is still valid, or generate a new one
    let captureToken = assessment.captureToken;
    const now = new Date();
    if (!captureToken || !assessment.captureTokenExpiry || assessment.captureTokenExpiry < now) {
      const crypto = await import("crypto");
      captureToken = crypto.randomBytes(32).toString("hex");
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: {
          captureToken,
          captureTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const captureUrl = `${baseUrl}/capture/${captureToken}`;
    const isPt = (assessment.patient?.preferredLocale || language) === "pt-BR";
    const clinicName = assessment.clinic?.name || "BPR Rehab";

    // Send notification to patient
    try {
      const { notifyPatient } = await import("@/lib/notify-patient");
      await notifyPatient({
        patientId: assessment.patient.id,
        emailTemplateSlug: "CAPTURE_LINK",
        emailVars: {
          patientName: assessment.patient.firstName,
          clinicName,
          captureUrl,
          portalUrl: `${baseUrl}/dashboard/body-assessments`,
        },
        plainMessage: isPt
          ? `Olá ${assessment.patient.firstName}! 📸\n\nSua avaliação corporal está pronta para captura de fotos. Abra o link abaixo no seu celular para tirar as fotos:\n\n${captureUrl}\n\nInstruções:\n• Use roupa justa\n• Local bem iluminado\n• Corpo inteiro visível\n• Tire as 4 fotos (frente, costas, esquerda, direita)\n\nEquipe ${clinicName}`
          : `Hi ${assessment.patient.firstName}! 📸\n\nYour body assessment is ready for photo capture. Open the link below on your phone to take the photos:\n\n${captureUrl}\n\nInstructions:\n• Wear tight-fitting clothes\n• Well-lit area\n• Full body visible\n• Take all 4 photos (front, back, left, right)\n\nTeam ${clinicName}`,
        plainMessagePt: `Olá ${assessment.patient.firstName}! 📸\n\nSua avaliação corporal está pronta para captura de fotos. Abra o link abaixo no seu celular para tirar as fotos:\n\n${captureUrl}\n\nInstruções:\n• Use roupa justa\n• Local bem iluminado\n• Corpo inteiro visível\n• Tire as 4 fotos (frente, costas, esquerda, direita)\n\nEquipe ${clinicName}`,
      });
    } catch (emailErr) {
      console.error("[send-capture-link] Failed to send notification:", emailErr);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      captureUrl,
      message: isPt
        ? `Link de captura enviado para ${assessment.patient.email}`
        : `Capture link sent to ${assessment.patient.email}`,
    });
  } catch (error) {
    console.error("Error sending capture link:", error);
    return NextResponse.json(
      { error: "Failed to send capture link" },
      { status: 500 }
    );
  }
}
