import ffmpeg from "fluent-ffmpeg";
import path from "path";

// Extracts a single frame ~10% into the video as a JPEG thumbnail.
// Percentage-based timestamp works for both very short and long clips
// without needing a separate ffprobe duration lookup.
export async function generateVideoThumbnail(videoPath: string, thumbPath: string): Promise<void> {
  const folder = path.dirname(thumbPath);
  const filename = path.basename(thumbPath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .on("error", reject)
      .on("end", () => resolve())
      .screenshots({
        timestamps: ["10%"],
        filename,
        folder,
        size: "640x?",
      });
  });
}
