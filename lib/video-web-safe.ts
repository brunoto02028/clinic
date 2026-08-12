import ffmpeg from "fluent-ffmpeg";
import { rename, unlink } from "fs/promises";
import path from "path";

/**
 * Patients open exercise videos on whatever phone they own, so every file has
 * to land on the one combination that plays everywhere: H.264 video in
 * yuv420p, AAC audio, an .mp4 container, and the moov atom moved to the front
 * (faststart).
 *
 * Editors like CapCut/Premiere happily export H.265, .mov containers, or
 * files with the index at the end — all of which either fail outright on some
 * devices or force the browser to download the whole video before playing.
 */

export interface VideoProbe {
  videoCodec: string | null;
  audioCodec: string | null;
  pixFmt: string | null;
  container: string;
  /** True when it can be stream-copied rather than re-encoded. */
  codecsAreWebSafe: boolean;
}

export interface NormalizeResult {
  /** Absolute path of the file to use from here on. */
  path: string;
  /** ".mp4" — callers must update stored URLs when the extension changed. */
  extension: string;
  action: "transcoded" | "remuxed" | "failed";
  probe: VideoProbe | null;
  error?: string;
}

const WEB_SAFE_VIDEO = "h264";
const WEB_SAFE_AUDIO = new Set(["aac", "mp3"]);
const WEB_SAFE_PIX_FMT = new Set(["yuv420p", "yuvj420p"]);

export async function probeVideo(filePath: string): Promise<VideoProbe> {
  const metadata = await new Promise<any>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => (err ? reject(err) : resolve(data)));
  });

  const streams: any[] = metadata?.streams || [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");

  const videoCodec = video?.codec_name ?? null;
  const audioCodec = audio?.codec_name ?? null;
  const pixFmt = video?.pix_fmt ?? null;

  const codecsAreWebSafe =
    videoCodec === WEB_SAFE_VIDEO &&
    (!pixFmt || WEB_SAFE_PIX_FMT.has(pixFmt)) &&
    (!audioCodec || WEB_SAFE_AUDIO.has(audioCodec));

  return {
    videoCodec,
    audioCodec,
    pixFmt,
    container: path.extname(filePath).toLowerCase().replace(".", ""),
    codecsAreWebSafe,
  };
}

function runFfmpeg(input: string, output: string, opts: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(opts)
      .on("error", reject)
      .on("end", () => resolve())
      .save(output);
  });
}

/**
 * Rewrites the file in place as a web-safe .mp4, returning the path to use.
 * On any ffmpeg failure the original file is left untouched and the caller
 * gets action: "failed" — a video that plays on *some* devices beats losing
 * the upload entirely.
 */
export async function ensureWebSafeVideo(inputPath: string): Promise<NormalizeResult> {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  const targetPath = path.join(dir, `${base}.mp4`);
  const tempPath = path.join(dir, `.tmp-websafe-${Date.now()}-${base}.mp4`);

  let probe: VideoProbe | null = null;
  try {
    probe = await probeVideo(inputPath);
  } catch (err: any) {
    return { path: inputPath, extension: path.extname(inputPath), action: "failed", probe: null, error: `probe failed: ${err.message}` };
  }

  // Already H.264/AAC: copy the streams into a fresh mp4 rather than
  // re-encoding. Costs a fraction of a second and loses no quality, while
  // still guaranteeing the container and faststart.
  const opts = probe.codecsAreWebSafe
    ? ["-c copy", "-movflags +faststart"]
    : ["-c:v libx264", "-preset veryfast", "-crf 23", "-pix_fmt yuv420p", "-c:a aac", "-b:a 128k", "-movflags +faststart"];

  try {
    await runFfmpeg(inputPath, tempPath, opts);
  } catch (err: any) {
    await unlink(tempPath).catch(() => {});
    // A stream copy can fail on containers that carry codecs mp4 won't hold;
    // fall back to a real transcode before giving up.
    if (probe.codecsAreWebSafe) {
      try {
        await runFfmpeg(inputPath, tempPath, [
          "-c:v libx264", "-preset veryfast", "-crf 23", "-pix_fmt yuv420p", "-c:a aac", "-b:a 128k", "-movflags +faststart",
        ]);
        await replaceOriginal(inputPath, tempPath, targetPath);
        return { path: targetPath, extension: ".mp4", action: "transcoded", probe };
      } catch (err2: any) {
        await unlink(tempPath).catch(() => {});
        return { path: inputPath, extension: path.extname(inputPath), action: "failed", probe, error: err2.message };
      }
    }
    return { path: inputPath, extension: path.extname(inputPath), action: "failed", probe, error: err.message };
  }

  await replaceOriginal(inputPath, tempPath, targetPath);
  return {
    path: targetPath,
    extension: ".mp4",
    action: probe.codecsAreWebSafe ? "remuxed" : "transcoded",
    probe,
  };
}

async function replaceOriginal(inputPath: string, tempPath: string, targetPath: string) {
  await rename(tempPath, targetPath);
  // When the source was .mov/.avi the original is a different file — drop it
  // so we don't leave orphans on the volume.
  if (path.resolve(inputPath) !== path.resolve(targetPath)) {
    await unlink(inputPath).catch(() => {});
  }
}
