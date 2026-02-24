import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

// GET - Single exercise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        prescriptions: {
          where: { isActive: true },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json({ exercise });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
}

// PATCH - Update exercise
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const formData = await req.formData();

    const updateData: any = {};

    const name = formData.get("name") as string | null;
    if (name) updateData.name = name;

    const description = formData.get("description");
    if (description !== null) updateData.description = description as string;

    const instructions = formData.get("instructions");
    if (instructions !== null) updateData.instructions = instructions as string;

    const bodyRegion = formData.get("bodyRegion") as string | null;
    if (bodyRegion) updateData.bodyRegion = bodyRegion;

    const difficulty = formData.get("difficulty") as string | null;
    if (difficulty) updateData.difficulty = difficulty;

    const tagsRaw = formData.get("tags") as string | null;
    if (tagsRaw !== null) {
      updateData.tags = tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    }

    const defaultSets = formData.get("defaultSets");
    if (defaultSets !== null) updateData.defaultSets = defaultSets ? parseInt(defaultSets as string) : null;

    const defaultReps = formData.get("defaultReps");
    if (defaultReps !== null) updateData.defaultReps = defaultReps ? parseInt(defaultReps as string) : null;

    const defaultHoldSec = formData.get("defaultHoldSec");
    if (defaultHoldSec !== null) updateData.defaultHoldSec = defaultHoldSec ? parseInt(defaultHoldSec as string) : null;

    const defaultRestSec = formData.get("defaultRestSec");
    if (defaultRestSec !== null) updateData.defaultRestSec = defaultRestSec ? parseInt(defaultRestSec as string) : null;

    const durationRaw = formData.get("duration");
    if (durationRaw !== null) updateData.duration = durationRaw ? parseInt(durationRaw as string) : null;

    // Handle video upload
    const videoFile = formData.get("video") as File | null;
    const externalVideoUrl = formData.get("videoUrl") as string | null;

    if (videoFile && videoFile.size > 0) {
      const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
      if (!allowedTypes.includes(videoFile.type)) {
        return NextResponse.json({ error: "Invalid video format" }, { status: 400 });
      }
      if (videoFile.size > 500 * 1024 * 1024) {
        return NextResponse.json({ error: "Video too large (max 500MB)" }, { status: 400 });
      }

      const videosDir = path.join(process.cwd(), "public", "uploads", "exercises");
      await mkdir(videosDir, { recursive: true });

      const ext = path.extname(videoFile.name) || ".mp4";
      const safeName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(ext, "");
      const uniqueName = `${Date.now()}-${safeName}${ext}`;
      const filePath = path.join(videosDir, uniqueName);

      const bytes = await videoFile.arrayBuffer();
      await writeFile(filePath, new Uint8Array(bytes));

      updateData.videoUrl = `/uploads/exercises/${uniqueName}`;
      updateData.videoFileName = videoFile.name;
    } else if (externalVideoUrl !== null) {
      updateData.videoUrl = externalVideoUrl || null;
    }

    // Handle thumbnail
    const thumbnailFile = formData.get("thumbnail") as File | null;
    if (thumbnailFile && thumbnailFile.size > 0) {
      const thumbDir = path.join(process.cwd(), "public", "uploads", "exercises", "thumbnails");
      await mkdir(thumbDir, { recursive: true });

      const ext = path.extname(thumbnailFile.name) || ".jpg";
      const uniqueName = `${Date.now()}-thumb${ext}`;
      const filePath = path.join(thumbDir, uniqueName);

      const bytes = await thumbnailFile.arrayBuffer();
      await writeFile(filePath, new Uint8Array(bytes));

      updateData.thumbnailUrl = `/uploads/exercises/thumbnails/${uniqueName}`;
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ exercise });
  } catch (err: any) {
    console.error("Exercise PATCH error:", err);
    return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
  }
}

// DELETE - Soft delete exercise
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.exercise.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
  }
}
