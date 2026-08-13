import { writeFile, mkdtemp, rm, readFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { tmpdir } from "os";
import path from "path";
import { ensureWebSafeVideo } from "@/lib/video-web-safe";
import { generateVideoThumbnail, getVideoDuration } from "@/lib/video-thumbnail";
import { isR2Configured, missingR2Vars, uploadToR2, uploadStreamToR2, deleteR2Url } from "@/lib/r2";
import { contentTypeFor } from "@/lib/content-types";

/**
 * One path for turning an uploaded video into stored media.
 *
 * ffmpeg needs a real file, so disk is a staging area, not storage: write to a
 * temp dir, normalise, pull a thumbnail and the duration, push both to R2, then
 * delete the temp dir. Nothing is left on the VPS.
 *
 * The three upload routes (single, bulk, Instagram) all go through here so the
 * rules can't drift apart between them — they already had three near-copies of
 * this sequence.
 */

export interface StoredExerciseMedia {
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  videoFileName: string;
}

export class MediaStorageError extends Error {}

/** Thumbnails are served from a public domain, so the set is deliberately
 *  narrow — SVG in particular is a document, not a picture. */
export const ALLOWED_THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

/** Undo a partial store when the caller's database write fails afterwards. */
export async function discardStoredMedia(stored: StoredExerciseMedia | null): Promise<void> {
  if (!stored) return;
  for (const url of [stored.videoUrl, stored.thumbnailUrl]) {
    try {
      await deleteR2Url(url);
    } catch (err: any) {
      console.error("Failed to roll back stored media:", err.message);
    }
  }
}

function safeBaseName(originalName: string): string {
  const ext = path.extname(originalName) || ".mp4";
  const stem = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 80);
  return `${Date.now()}-${stem}`;
}

export async function processAndStoreExerciseVideo(
  bytes: Buffer,
  originalName: string,
  opts: { extractThumbnail?: boolean } = {}
): Promise<StoredExerciseMedia> {
  const { extractThumbnail = true } = opts;
  if (!isR2Configured()) {
    // Falling back to disk here would quietly recreate the unbacked-up files
    // this migration removed, and nobody would notice until a disk failure.
    throw new MediaStorageError(
      `Media storage is not configured (missing: ${missingR2Vars().join(", ")})`
    );
  }

  const workDir = await mkdtemp(path.join(tmpdir(), "bpr-video-"));
  try {
    const ext = path.extname(originalName) || ".mp4";
    const base = safeBaseName(originalName);
    const localVideo = path.join(workDir, `${base}${ext}`);
    await writeFile(localVideo, bytes);

    // Patients open these on whatever phone they own — H.264/yuv420p/mp4 with
    // faststart is the combination that plays everywhere.
    let finalPath = localVideo;
    try {
      const norm = await ensureWebSafeVideo(localVideo);
      if (norm.action !== "failed") finalPath = norm.path;
      else console.error("Video normalisation failed:", norm.error);
    } catch (err: any) {
      console.error("Video normalisation threw:", err.message);
    }

    const finalName = path.basename(finalPath);

    let duration: number | null = null;
    try {
      duration = await getVideoDuration(finalPath);
    } catch (err: any) {
      console.error("Duration extraction failed:", err.message);
    }

    let thumbnailUrl: string | null = null;
    if (extractThumbnail) {
      try {
        const thumbName = `${base}-thumb.jpg`;
        const localThumb = path.join(workDir, thumbName);
        await generateVideoThumbnail(finalPath, localThumb);
        thumbnailUrl = await uploadToR2(
          `exercises/thumbnails/${thumbName}`,
          await readFile(localThumb),
          "image/jpeg"
        );
      } catch (err: any) {
        // A missing thumbnail is a cosmetic loss; a missing video is not.
        console.error("Thumbnail generation failed:", err.message);
      }
    }

    // Streamed rather than read into memory: uploads go up to 500MB, and
    // buffering the file a second time would double the peak on a small VPS.
    const videoUrl = await uploadStreamToR2(
      `exercises/${finalName}`,
      createReadStream(finalPath),
      (await stat(finalPath)).size,
      contentTypeFor(finalName)
    );

    return { videoUrl, thumbnailUrl, duration, videoFileName: originalName };
  } finally {
    // Runs on the error path too — otherwise a failed upload leaves the file
    // behind and the disk fills up invisibly.
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
