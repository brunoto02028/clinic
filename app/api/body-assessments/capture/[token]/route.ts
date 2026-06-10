import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// Simple in-memory rate limiting: max 5 captures per IP per hour
const rateLimitMap = new Map();
function checkRateLimit(ip: string, max = 5, windowMs = 3600000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}
import { uploadToS3, getPublicS3Url } from "@/lib/s3";
import { writeFile, mkdir, copyFile, unlink } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { removeBackground } from "@/lib/remove-bg";

const execFileAsync = promisify(execFile);

async function blurFaceOnFile(filePath: string, patientId?: string, token?: string): Promise<void> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "blur-faces.py");
    const tempBlurred = filePath + ".blurred.jpg";
    await execFileAsync("python3", [scriptPath, filePath, tempBlurred], { timeout: 30000 });
    await copyFile(tempBlurred, filePath);
    await unlink(tempBlurred).catch(() => {});
    console.log(`[blur-faces] Blurred face in ${filePath}`);
  } catch (err: any) {
    console.error(`[blur-faces] CRITICAL: Face blur failed for user. Rosto do paciente pode estar exposto. Error:`, err?.message);
    // Notify admin about face blur failure
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com';
      await fetch(`${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/api/admin/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'face-blur-failure', patientId, token, error: err?.message, adminEmail }),
      }).catch(() => {});
    } catch (notifyErr) {
      console.error('[blur-faces] Failed to notify admin:', notifyErr);
    }
  }
}

// GET - Get assessment info by capture token (no auth - public link)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // Rate limit check
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    const assessment = await (prisma as any).bodyAssessment.findFirst({
      where: {
        captureToken: token,
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
          select: { firstName: true, lastName: true, preferredLocale: true },
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
// Supports both JSON body and FormData
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

    // Parse request — support both FormData and JSON
    let view: string | null = null;
    let imageData: string | null = null;
    let imageFile: File | null = null;
    let landmarks: any = null;
    let captureMetadata: any = null;
    let status: string | null = null;
    let movementVideo: any = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      view = formData.get("view") as string | null;
      imageFile = formData.get("image") as File | null;
      const landmarksStr = formData.get("landmarks") as string | null;
      if (landmarksStr) {
        try { landmarks = JSON.parse(landmarksStr); } catch {}
      }
      status = formData.get("status") as string | null;
      // Handle movement video from FormData
      const videoFile = formData.get("movementVideo") as File | null;
      if (videoFile) {
        const testType = formData.get("testType") as string || "unknown";
        const label = formData.get("label") as string || testType;
        const duration = parseFloat(formData.get("duration") as string || "0");
        movementVideo = { testType, label, duration, videoFile };
      }
    } else {
      const body = await request.json();
      view = body.view || null;
      imageData = body.imageData || null;
      landmarks = body.landmarks || null;
      captureMetadata = body.captureMetadata || null;
      status = body.status || null;
      movementVideo = body.movementVideo || null;
    }

    const updateData: any = {};

    // Handle image upload per view
    if (view && (imageData || imageFile)) {
      const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
      const uploadsDir = path.join(uploadsBase, "body-assessments", assessment.id);
      await mkdir(uploadsDir, { recursive: true });

      const ts = Date.now();
      const filename = `${view}-${ts}.jpg`;
      const localPath = path.join(uploadsDir, filename);
      const key = `body-assessments/${assessment.id}/${filename}`;

      if (imageFile) {
        // FormData file upload — save directly to disk
        const arrayBuffer = await imageFile.arrayBuffer();
        await writeFile(localPath, Buffer.from(arrayBuffer));
      } else if (imageData && imageData.startsWith("data:")) {
        // Base64 data — decode and save to disk
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
        await writeFile(localPath, Buffer.from(base64Data, "base64"));
      }

      // Save original backup
      const originalPath = path.join(uploadsDir, `${view}-${ts}-original.jpg`);
      await copyFile(localPath, originalPath);

      // Run face blur + bg removal in background (non-blocking)
      blurFaceOnFile(localPath, assessment.patientId, params.token).catch(() => {});
      removeBackground(localPath).catch(() => {});

      // Upload to S3 and use S3 URL in DB (persistent across redeploys)
      let imageUrl = `/uploads/body-assessments/${assessment.id}/${filename}`;
      try {
        const { readFile: readFs } = await import("fs/promises");
        const fileBuffer = await readFs(localPath);
        imageUrl = await uploadToS3(key, fileBuffer, "image/jpeg");
      } catch (s3Error: any) {
        console.warn("[capture] S3 upload failed, using local URL:", s3Error?.message);
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
      const existing: any[] = Array.isArray(assessment.movementVideos) ? assessment.movementVideos : [];

      if (movementVideo.videoFile) {
        // FormData video — save to disk + S3
        const videoUploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
        const videoDir = path.join(videoUploadsBase, "body-assessments", assessment.id);
        await mkdir(videoDir, { recursive: true });
        const vidFilename = `${movementVideo.testType}-${Date.now()}.webm`;
        const vidPath = path.join(videoDir, vidFilename);
        const vidBuffer = Buffer.from(await movementVideo.videoFile.arrayBuffer());
        await writeFile(vidPath, vidBuffer);

        // Upload video to S3
        const vidKey = `body-assessments/${assessment.id}/${vidFilename}`;
        let videoUrl = `/uploads/body-assessments/${assessment.id}/${vidFilename}`;
        try {
          videoUrl = await uploadToS3(vidKey, vidBuffer, "video/webm");
        } catch (s3Err: any) {
          console.warn("[capture] S3 video upload failed, using local:", s3Err?.message);
        }

        const videoEntry = {
          id: `${movementVideo.testType}_${Date.now()}`,
          testType: movementVideo.testType,
          label: movementVideo.label,
          duration: movementVideo.duration,
          videoUrl,
          videoPath: vidKey,
          createdAt: new Date().toISOString(),
        };
        const filtered = existing.filter((v: any) => v.testType !== movementVideo.testType);
        updateData.movementVideos = [...filtered, videoEntry];
      } else {
        // JSON video data
        const { testType, label, duration, videoDataUrl } = movementVideo;
        const videoEntry = {
          id: `${testType}_${Date.now()}`,
          testType,
          label,
          duration,
          videoUrl: videoDataUrl || null,
          videoPath: null,
          createdAt: new Date().toISOString(),
        };
        const filtered = existing.filter((v: any) => v.testType !== testType);
        updateData.movementVideos = [...filtered, videoEntry];
      }
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
