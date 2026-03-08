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
    const { views, reason, instructions, language = "pt-BR" } = body;

    // views: string[] e.g. ["front", "left"]
    // reason: string e.g. "Foto frontal cortada nos pés"
    // instructions: string e.g. "Fique mais longe da câmera, corpo inteiro visível"

    if (!views || !Array.isArray(views) || views.length === 0) {
      return NextResponse.json({ error: "At least one view is required" }, { status: 400 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, preferredLocale: true },
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
      // Generate new capture token (valid 7 days)
      const crypto = await import("crypto");
      captureToken = crypto.randomBytes(32).toString("hex");
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: {
          captureToken,
          captureTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "RECAPTURE_REQUESTED",
        },
      });
    } else {
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: { status: "RECAPTURE_REQUESTED" },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const captureUrl = `${baseUrl}/capture/${captureToken}`;

    const isPt = (assessment.patient?.preferredLocale || language) === "pt-BR";

    const viewLabels: Record<string, { en: string; pt: string }> = {
      front: { en: "Frontal View", pt: "Vista Frontal" },
      back: { en: "Posterior View", pt: "Vista Posterior" },
      left: { en: "Left Lateral", pt: "Lateral Esquerda" },
      right: { en: "Right Lateral", pt: "Lateral Direita" },
    };

    const viewList = views.map((v: string) => isPt ? viewLabels[v]?.pt || v : viewLabels[v]?.en || v).join(", ");

    // Send notification to patient
    try {
      const { notifyPatient } = await import("@/lib/notify-patient");
      await notifyPatient({
        patientId: assessment.patient.id,
        emailTemplateSlug: "RECAPTURE_REQUESTED",
        emailVars: {
          patientName: assessment.patient.firstName,
          views: viewList,
          reason: reason || (isPt ? "Fotos precisam ser refeitas para melhor análise." : "Photos need to be retaken for better analysis."),
          instructions: instructions || (isPt
            ? "Por favor, siga as instruções na tela ao tirar as fotos. Certifique-se de que o corpo inteiro esteja visível, boa iluminação e fundo neutro."
            : "Please follow the on-screen instructions when taking photos. Ensure your full body is visible, good lighting, and neutral background."),
          captureUrl,
          portalUrl: `${baseUrl}/dashboard/body-assessments`,
        },
        plainMessage: isPt
          ? `Olá ${assessment.patient.firstName}, precisamos que você refaça algumas fotos da sua avaliação corporal (${viewList}). Motivo: ${reason || "Melhoria na qualidade"}. Acesse o link para enviar novas fotos: ${captureUrl}`
          : `Hi ${assessment.patient.firstName}, we need you to retake some photos for your body assessment (${viewList}). Reason: ${reason || "Quality improvement"}. Click the link to submit new photos: ${captureUrl}`,
        plainMessagePt: `Olá ${assessment.patient.firstName}, precisamos que você refaça algumas fotos da sua avaliação corporal (${viewList}). Motivo: ${reason || "Melhoria na qualidade"}. Acesse o link para enviar novas fotos: ${captureUrl}`,
      });
    } catch (emailErr) {
      console.error("[request-recapture] Failed to send notification:", emailErr);
    }

    return NextResponse.json({
      success: true,
      captureUrl,
      views,
      message: isPt
        ? `Solicitação de re-captura enviada para ${assessment.patient.firstName}. Vistas: ${viewList}`
        : `Recapture request sent to ${assessment.patient.firstName}. Views: ${viewList}`,
    });
  } catch (error) {
    console.error("Error requesting recapture:", error);
    return NextResponse.json(
      { error: "Failed to request recapture" },
      { status: 500 }
    );
  }
}
