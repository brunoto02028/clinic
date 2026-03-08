import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, copyFile, unlink } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { removeBackground } from "@/lib/remove-bg";

const execFileAsync = promisify(execFile);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify assessment exists
    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      select: { id: true, patientId: true, status: true },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const view = formData.get("view") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!view || !["front", "back", "left", "right"].includes(view)) {
      return NextResponse.json({ error: "Invalid view. Must be front, back, left, or right." }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Accepted: JPEG, PNG, WebP, HEIC." }, { status: 400 });
    }

    // Max 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 25MB." }, { status: 400 });
    }

    // Save file locally
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "body-assessments", params.id);
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ts = Date.now();
    const filename = `${view}-${ts}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Save original (unblurred) as backup
    const originalFilename = `${view}-${ts}-original.${ext}`;
    const originalPath = path.join(uploadsDir, originalFilename);
    await copyFile(filePath, originalPath);

    // Apply face blur using Python/OpenCV
    try {
      const scriptPath = path.join(process.cwd(), "scripts", "blur-faces.py");
      const tempBlurred = filePath + ".blurred.jpg";
      await execFileAsync("python3", [scriptPath, filePath, tempBlurred], { timeout: 30000 });
      // Replace main file with blurred version
      await copyFile(tempBlurred, filePath);
      // Clean up temp file
      await unlink(tempBlurred).catch(() => {});
      console.log(`[blur-faces] Successfully blurred face in ${view} view for assessment ${params.id}`);
    } catch (blurError: any) {
      console.warn(`[blur-faces] Face blur failed (non-fatal), using original image:`, blurError?.message || blurError);
      // Continue with original image if blur fails
    }

    // Remove background (replace with white) using rembg
    await removeBackground(filePath);

    const imageUrl = `/uploads/body-assessments/${params.id}/${filename}`;

    // Update the assessment with the image URL
    const updateData: any = {};
    switch (view) {
      case "front":
        updateData.frontImageUrl = imageUrl;
        updateData.frontImagePath = `body-assessments/${params.id}/${filename}`;
        break;
      case "back":
        updateData.backImageUrl = imageUrl;
        updateData.backImagePath = `body-assessments/${params.id}/${filename}`;
        break;
      case "left":
        updateData.leftImageUrl = imageUrl;
        updateData.leftImagePath = `body-assessments/${params.id}/${filename}`;
        break;
      case "right":
        updateData.rightImageUrl = imageUrl;
        updateData.rightImagePath = `body-assessments/${params.id}/${filename}`;
        break;
    }

    // If status is still PENDING_CAPTURE, advance to PENDING_ANALYSIS
    if (assessment.status === "PENDING_CAPTURE") {
      updateData.status = "PENDING_ANALYSIS";
    }

    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      view,
      imageUrl,
      assessment: updated,
    });
  } catch (error) {
    console.error("Error uploading body assessment photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
