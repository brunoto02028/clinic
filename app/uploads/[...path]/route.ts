import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { existsSync, statSync, createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { CONTENT_TYPES } from "@/lib/content-types";

export const dynamic = "force-dynamic";

// Exercise videos live in R2 now; this route still serves everything that
// stayed on disk — article images, the logo, and patient files.

/**
 * Folders holding patient data. Everything else here is public by design:
 * article images, the logo, marketing assets.
 *
 * This route sits outside the middleware — its matcher skips any path with a
 * dot in it, which is every file — so a scan or a referral letter was readable
 * by anyone holding the URL, with no session at all. The paths are unguessable
 * (cuid plus timestamp), but "hard to guess" is not access control, and this is
 * health data.
 */
const PATIENT_DATA_DIRS = ["documents", "body-assessments", "scans", "exports"];

const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

/** `documents/<patientId>/<file>` — the owner is the second segment. */
function ownerIdFromPath(segments: string[]): string | null {
  return segments[0] === "documents" && segments.length > 1 ? segments[1] : null;
}

async function isAllowed(segments: string[]): Promise<boolean> {
  if (!PATIENT_DATA_DIRS.includes(segments[0])) return true;

  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const role = (session.user as any)?.role;
  if (STAFF_ROLES.includes(role)) return true;

  // A patient reaches their own documents and nobody else's. The other folders
  // key off ids this route cannot resolve to an owner, so they stay staff-only.
  const owner = ownerIdFromPath(segments);
  return !!owner && owner === (session.user as any)?.id;
}

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

  // 404 rather than 401: a refusal that distinguishes "exists but forbidden"
  // from "does not exist" tells an outsider which patient ids are real.
  if (!(await isAllowed(params.path))) {
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
