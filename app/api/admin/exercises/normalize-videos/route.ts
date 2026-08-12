import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import path from "path";
import { existsSync } from "fs";
import { probeVideo, ensureWebSafeVideo } from "@/lib/video-web-safe";
import { generateVideoThumbnail } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * TEMPORARY — brings videos uploaded before web-safe normalisation up to
 * H.264/AAC mp4 with faststart, so they play on any patient device.
 *
 * Run `?dryRun=true` first to see what's actually there, then work through it
 * in batches (`?limit=20&offset=0`, `offset=20`, …) — transcoding the whole
 * library in one request would outlive the proxy timeout.
 *
 * Delete this route once the library reports clean.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10) || 20, 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

  const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

  const where = { isActive: true, videoUrl: { startsWith: "/uploads/" } } as const;
  const total = await prisma.exercise.count({ where });

  const exercises = await prisma.exercise.findMany({
    where,
    select: { id: true, name: true, videoUrl: true, thumbnailUrl: true },
    orderBy: { createdAt: "asc" },
    skip: dryRun ? 0 : offset,
    take: dryRun ? total : limit,
  });

  const results: any[] = [];
  const summary = { alreadyWebSafe: 0, needsTranscode: 0, needsRemux: 0, missingFile: 0, probeFailed: 0 };

  for (const ex of exercises) {
    const filePath = path.join(uploadsBase, ex.videoUrl!.replace(/^\/uploads\//, ""));

    if (!existsSync(filePath)) {
      summary.missingFile++;
      results.push({ id: ex.id, name: ex.name, status: "missing-file", videoUrl: ex.videoUrl });
      continue;
    }

    let probe;
    try {
      probe = await probeVideo(filePath);
    } catch (err: any) {
      summary.probeFailed++;
      results.push({ id: ex.id, name: ex.name, status: "probe-failed", error: err.message });
      continue;
    }

    const isMp4 = path.extname(filePath).toLowerCase() === ".mp4";
    if (probe.codecsAreWebSafe) {
      // Still needs a pass to guarantee faststart / mp4 container, but it's
      // the cheap stream-copy path.
      if (isMp4) summary.alreadyWebSafe++;
      summary.needsRemux++;
    } else {
      summary.needsTranscode++;
    }

    if (dryRun) {
      results.push({
        id: ex.id,
        name: ex.name,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        pixFmt: probe.pixFmt,
        container: probe.container,
        plan: probe.codecsAreWebSafe ? "remux" : "transcode",
      });
      continue;
    }

    try {
      const norm = await ensureWebSafeVideo(filePath);
      if (norm.action === "failed") {
        results.push({ id: ex.id, name: ex.name, status: "failed", error: norm.error });
        continue;
      }

      const newUrl = `/uploads/exercises/${path.basename(norm.path)}`;
      const data: any = {};
      if (newUrl !== ex.videoUrl) data.videoUrl = newUrl;

      // A container change invalidates nothing else, but if the thumbnail was
      // never generated this is a good moment to fill it in.
      if (!ex.thumbnailUrl) {
        try {
          const thumbDir = path.join(uploadsBase, "exercises", "thumbnails");
          const thumbName = `${Date.now()}-thumb.jpg`;
          await generateVideoThumbnail(norm.path, path.join(thumbDir, thumbName));
          data.thumbnailUrl = `/uploads/exercises/thumbnails/${thumbName}`;
        } catch {
          /* thumbnail is a nice-to-have here */
        }
      }

      if (Object.keys(data).length > 0) {
        await prisma.exercise.update({ where: { id: ex.id }, data });
      }

      results.push({ id: ex.id, name: ex.name, status: norm.action, videoUrl: data.videoUrl || ex.videoUrl });
    } catch (err: any) {
      results.push({ id: ex.id, name: ex.name, status: "failed", error: err.message });
    }
  }

  return NextResponse.json({
    dryRun,
    total,
    examined: exercises.length,
    offset: dryRun ? 0 : offset,
    nextOffset: dryRun ? null : offset + exercises.length < total ? offset + exercises.length : null,
    summary,
    results,
  });
}
