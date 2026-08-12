import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import path from "path";
import { getVideoDuration } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";

// TEMPORARY — one-off backfill for exercises created before video duration
// was auto-computed at upload time. Run once in production, confirm
// failCount === 0 (or investigate remaining failures), then delete this route.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

  const exercises = await prisma.exercise.findMany({
    where: { duration: null, videoUrl: { startsWith: "/uploads/" } },
    select: { id: true, name: true, videoUrl: true },
  });

  const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];

  for (const ex of exercises) {
    try {
      const videoPath = path.join(uploadsBase, ex.videoUrl!.replace(/^\/uploads\//, ""));
      const duration = await getVideoDuration(videoPath);
      await prisma.exercise.update({ where: { id: ex.id }, data: { duration } });
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
