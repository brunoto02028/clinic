import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { CONTENT_TYPES } from "@/lib/content-types";

export const dynamic = "force-dynamic";

// Exercise videos live in R2 now; this route still serves everything that
// stayed on disk — article images, the logo, patient documents.

function toWebStream(nodeStream: Readable): ReadableStream {
  return Readable.toWeb(nodeStream) as unknown as ReadableStream;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const uploadsDir =
    process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, ...params.path);
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(uploadsDir);

  // Prevent path traversal
  if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!existsSync(resolvedPath) || !statSync(resolvedPath).isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  const fileSize = statSync(resolvedPath).size;
  const isVideo = contentType.startsWith("video/");

  // Cloudflare caches .mp4 by extension and then answers Range requests with a
  // plain 200, which Safari refuses to play — verified by comparing the origin
  // (206 + Content-Range) against the same request through the edge (200).
  // Marking video uncacheable makes the edge pass the range through. Images
  // keep their long cache.
  const cacheControl = isVideo
    ? "private, no-store, no-transform"
    : "public, max-age=31536000";

  // Safari (iOS/iPadOS especially) will not play a video unless the server
  // honours Range requests — it probes with one and gives up on a plain 200,
  // leaving a black player that never starts.
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const startRaw = match[1];
      const endRaw = match[2];
      let start = startRaw ? parseInt(startRaw, 10) : 0;
      let end = endRaw ? parseInt(endRaw, 10) : fileSize - 1;

      // "bytes=-500" means the final 500 bytes.
      if (!startRaw && endRaw) {
        start = Math.max(0, fileSize - parseInt(endRaw, 10));
        end = fileSize - 1;
      }

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      end = Math.min(end, fileSize - 1);

      return new NextResponse(toWebStream(createReadStream(resolvedPath, { start, end })), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": cacheControl,
        },
      });
    }
  }

  return new NextResponse(toWebStream(createReadStream(resolvedPath)), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
    },
  });
}
