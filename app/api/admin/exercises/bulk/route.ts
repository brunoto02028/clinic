import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import path from "path";
import { assertValidExerciseFolder } from "@/lib/exercise-folders";
import {
  processAndStoreExerciseVideo,
  discardStoredMedia,
  type StoredExerciseMedia,
} from "@/lib/exercise-media";

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

    // Validate the destinations up front rather than per item: a batch that
    // half-lands in the wrong place is worse than one that is refused outright,
    // and this is the exact failure the reorganisation is meant to end.
    const destinations = [...new Set(metadata.map((m) => m.folderId || ""))];
    for (const dest of destinations) {
      const check = await assertValidExerciseFolder(dest || null, clinicId);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
    }

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"];
    const results: Array<{ name: string; success: boolean; error?: string; exerciseId?: string }> = [];

    for (const meta of metadata) {
      // Per item, so one bad row doesn't strand its own upload in the bucket.
      let storedMedia: StoredExerciseMedia | null = null;
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
        const tags = meta.tags ? meta.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean) : [];

        // Normalise, thumbnail, duration and upload all happen in one place,
        // shared with the single and Instagram routes.
        const stored = await processAndStoreExerciseVideo(
          Buffer.from(await videoFile.arrayBuffer()),
          videoFile.name
        );
        storedMedia = stored;

        const exercise = await (prisma as any).exercise.create({
          data: {
            clinicId,
            name: meta.name || videoFile.name.replace(ext, "").replace(/[-_]/g, " "),
            description: meta.description || null,
            bodyRegion: (meta.bodyRegion || "OTHER") as any,
            difficulty: (meta.difficulty || "BEGINNER") as any,
            tags,
            videoUrl: stored.videoUrl,
            videoFileName: stored.videoFileName,
            hasAudio: stored.hasAudio,
            thumbnailUrl: stored.thumbnailUrl,
            duration: stored.duration,
            folderId: meta.folderId || null,
            createdById: userId,
          },
        });

        results.push({ name: meta.name, success: true, exerciseId: exercise.id });
      } catch (err: any) {
        await discardStoredMedia(storedMedia);
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
