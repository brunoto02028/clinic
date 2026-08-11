import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { mkdir } from "fs/promises";
import path from "path";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";

// One-off: backfills thumbnailUrl for exercises uploaded before automatic
// thumbnail generation existed. Temporary route — remove after running once.
export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const thumbDir = path.join(uploadsBase, "exercises", "thumbnails");
  await mkdir(thumbDir, { recursive: true });

  const exercises = await prisma.exercise.findMany({
    where: { thumbnailUrl: null, videoUrl: { startsWith: "/uploads/" } },
    select: { id: true, name: true, videoUrl: true },
  });

  const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

  for (const ex of exercises) {
    try {
      const videoPath = path.join(uploadsBase, ex.videoUrl!.replace(/^\/uploads\//, ""));
      const thumbName = `${Date.now()}-thumb.jpg`;
      const thumbPath = path.join(thumbDir, thumbName);
      await generateVideoThumbnail(videoPath, thumbPath);
      await prisma.exercise.update({
        where: { id: ex.id },
        data: { thumbnailUrl: `/uploads/exercises/thumbnails/${thumbName}` },
      });
      results.push({ id: ex.id, name: ex.name, success: true });
    } catch (err: any) {
      results.push({ id: ex.id, name: ex.name, success: false, error: err.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    total: results.length,
    successCount,
    failCount: results.length - successCount,
    results,
  });
}
