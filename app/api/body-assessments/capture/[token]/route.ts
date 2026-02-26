import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePresignedUploadUrl } from "@/lib/s3";

// GET - Get assessment info by capture token (no auth - public link)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const assessment = await (prisma as any).bodyAssessment.findFirst({
      where: {
        captureToken: params.token,
        captureTokenExpiry: { gte: new Date() },
      },
      select: {
        id: true,
        assessmentNumber: true,
        status: true,
        captureTokenExpiry: true,
        frontImageUrl: true,
        backImageUrl: true,
        leftImageUrl: true,
        rightImageUrl: true,
        movementVideos: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
        clinic: {
          select: { name: true, logoUrl: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Invalid or expired capture link" },
        { status: 404 }
      );
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error fetching capture session:", error);
    return NextResponse.json(
      { error: "Failed to fetch capture session" },
      { status: 500 }
    );
  }
}

// PUT - Upload capture images by token (no auth - public link)
export async function PUT(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const assessment = await (prisma as any).bodyAssessment.findFirst({
      where: {
        captureToken: params.token,
        captureTokenExpiry: { gte: new Date() },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Invalid or expired capture link" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      view,
      imageData,
      landmarks,
      captureMetadata,
      status,
      movementVideo,
    } = body;

    const updateData: any = {};

    // Handle image upload per view
    if (view && imageData) {
      // Upload image to S3
      const ext = "jpg";
      const key = `body-assessments/${assessment.id}/${view}.${ext}`;

      let imageUrl = imageData;

      // If it's base64, try to upload to S3
      if (imageData.startsWith("data:")) {
        try {
          const { uploadUrl } = await generatePresignedUploadUrl(key, "image/jpeg");
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
          const binaryData = new Uint8Array(Buffer.from(base64Data, "base64"));
          await fetch(uploadUrl, {
            method: "PUT",
            body: binaryData,
            headers: { "Content-Type": "image/jpeg" },
          });
          // Use the S3 path
          imageUrl = imageData; // Keep base64 as fallback URL
        } catch (s3Error) {
          console.error("S3 upload failed, using base64:", s3Error);
        }
      }

      switch (view) {
        case "front":
          updateData.frontImageUrl = imageUrl;
          updateData.frontImagePath = key;
          if (landmarks) updateData.frontLandmarks = landmarks;
          break;
        case "back":
          updateData.backImageUrl = imageUrl;
          updateData.backImagePath = key;
          if (landmarks) updateData.backLandmarks = landmarks;
          break;
        case "left":
          updateData.leftImageUrl = imageUrl;
          updateData.leftImagePath = key;
          if (landmarks) updateData.leftLandmarks = landmarks;
          break;
        case "right":
          updateData.rightImageUrl = imageUrl;
          updateData.rightImagePath = key;
          if (landmarks) updateData.rightLandmarks = landmarks;
          break;
      }
    }

    // Handle movement video upload
    if (movementVideo) {
      const { testType, label, duration, videoDataUrl } = movementVideo;
      const existing: any[] = Array.isArray(assessment.movementVideos) ? assessment.movementVideos : [];

      // Store as base64 data URL (S3 upload can be added later for larger files)
      const videoEntry = {
        id: `${testType}_${Date.now()}`,
        testType,
        label,
        duration,
        videoUrl: videoDataUrl || null,
        videoPath: null,
        createdAt: new Date().toISOString(),
      };

      // Replace existing video for same test type, or add new
      const filtered = existing.filter((v: any) => v.testType !== testType);
      updateData.movementVideos = [...filtered, videoEntry];
    }

    if (captureMetadata) {
      updateData.captureMetadata = captureMetadata;
    }

    // Update status
    if (status) {
      updateData.status = status;
    } else if (view || movementVideo) {
      updateData.status = "CAPTURING";
    }

    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: assessment.id },
      data: updateData,
      select: {
        id: true,
        assessmentNumber: true,
        status: true,
        frontImageUrl: true,
        backImageUrl: true,
        leftImageUrl: true,
        rightImageUrl: true,
        movementVideos: true,
      },
    });

    // Send notification when capture is fully submitted
    if (status === 'PENDING_ANALYSIS') {
      try {
        const full = await (prisma as any).bodyAssessment.findUnique({
          where: { id: assessment.id },
          select: { patientId: true },
        });
        if (full?.patientId) {
          const { notifyPatient } = await import('@/lib/notify-patient');
          await notifyPatient({
            patientId: full.patientId,
            emailTemplateSlug: 'BODY_ASSESSMENT_SUBMITTED',
            emailVars: {
              portalUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard/body-assessments`,
            },
            plainMessage: 'Your body assessment photos have been submitted and are being analysed. You will be notified when results are ready.',
            plainMessagePt: 'Suas fotos de avaliação corporal foram enviadas e estão sendo analisadas. Você será notificado quando os resultados estiverem prontos.',
          });
        }
      } catch (emailErr) {
        console.error('[body-assessment] Failed to send notification:', emailErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating capture:", error);
    return NextResponse.json(
      { error: "Failed to update capture" },
      { status: 500 }
    );
  }
}
