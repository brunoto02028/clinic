import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { generateVideoThumbnail, getVideoDuration } from "@/lib/video-thumbnail";
import { ensureWebSafeVideo } from "@/lib/video-web-safe";

export const dynamic = "force-dynamic";

// POST - Bulk upload exercise videos
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    let clinicId = (session.user as any)?.clinicId;
    const userId = (session.user as any)?.id;

    if (!clinicId) {
      const anyClinic = await (prisma as any).clinic.findFirst({ select: { id: true } });
      clinicId = anyClinic?.id || null;
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic context" }, { status: 400 });
    }

    // Get metadata JSON (array of { name, bodyRegion, difficulty, description })
    const metadataRaw = formData.get("metadata") as string;
    const metadata: Array<{
      name: string;
      bodyRegion: string;
      difficulty?: string;
      description?: string;
      tags?: string;
      fileKey: string;
      folderId?: string;
    }> = metadataRaw ? JSON.parse(metadataRaw) : [];

    const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    const videosDir = path.join(uploadsBase, "exercises");
    const thumbDir = path.join(videosDir, "thumbnails");
    await mkdir(videosDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
    const results: Array<{ name: string; success: boolean; error?: string; exerciseId?: string }> = [];

    for (const meta of metadata) {
      try {
        const videoFile = formData.get(meta.fileKey) as File | null;
        
        if (!videoFile || videoFile.size === 0) {
          results.push({ name: meta.name, success: false, error: "No video file" });
          continue;
        }

        if (!allowedVideoTypes.includes(videoFile.type)) {
          results.push({ name: meta.name, success: false, error: `Invalid format: ${videoFile.type}` });
          continue;
        }

        if (videoFile.size > 500 * 1024 * 1024) {
          results.push({ name: meta.name, success: false, error: "File too large (max 500MB)" });
          continue;
        }

        // Save video
        const ext = path.extname(videoFile.name) || ".mp4";
        const safeName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(ext, "");
        const uniqueName = `${Date.now()}-${safeName}${ext}`;
        const filePath = path.join(videosDir, uniqueName);

        const bytes = await videoFile.arrayBuffer();
        await writeFile(filePath, new Uint8Array(bytes));

        // Normalise first so the thumbnail and duration below describe the
        // file patients will actually receive.
        let finalPath = filePath;
        let finalName = uniqueName;
        try {
          const norm = await ensureWebSafeVideo(filePath);
          if (norm.action !== "failed") {
            finalPath = norm.path;
            finalName = path.basename(norm.path);
          } else {
            console.error(`Video normalisation failed for ${meta.name}:`, norm.error);
          }
        } catch (normErr: any) {
          console.error(`Video normalisation threw for ${meta.name}:`, normErr.message);
        }

        const videoUrl = `/uploads/exercises/${finalName}`;
        const tags = meta.tags ? meta.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : [];

        let thumbnailUrl: string | null = null;
        try {
          const thumbName = `${Date.now()}-thumb.jpg`;
          await generateVideoThumbnail(finalPath, path.join(thumbDir, thumbName));
          thumbnailUrl = `/uploads/exercises/thumbnails/${thumbName}`;
        } catch (thumbErr: any) {
          console.error(`Auto-thumbnail generation failed for ${meta.name}:`, thumbErr.message);
        }

        let duration: number | null = null;
        try {
          duration = await getVideoDuration(finalPath);
        } catch (durErr: any) {
          console.error(`Duration extraction failed for ${meta.name}:`, durErr.message);
        }

        const exercise = await (prisma as any).exercise.create({
          data: {
            clinicId,
            name: meta.name || videoFile.name.replace(ext, "").replace(/[-_]/g, " "),
            description: meta.description || null,
            bodyRegion: (meta.bodyRegion || "OTHER") as any,
            difficulty: (meta.difficulty || "BEGINNER") as any,
            tags,
            videoUrl,
            videoFileName: videoFile.name,
            thumbnailUrl,
            duration,
            folderId: meta.folderId || null,
            createdById: userId,
          },
        });

        results.push({ name: meta.name, success: true, exerciseId: exercise.id });
      } catch (err: any) {
        results.push({ name: meta.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      total: results.length,
      successCount,
      failCount: results.length - successCount,
      results,
    });
  } catch (err: any) {
    console.error("Bulk upload error:", err);
    return NextResponse.json({ error: err.message || "Bulk upload failed" }, { status: 500 });
  }
}
