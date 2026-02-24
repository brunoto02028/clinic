import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

/**
 * Serve uploaded files from the persistent uploads directory.
 * This is needed because Next.js production mode does NOT serve
 * files added to public/ after build time.
 * 
 * Nginx serves /uploads/* directly (bypassing this route),
 * but this route acts as a fallback when nginx is not present (dev mode)
 * or when accessed via the /api/uploads/* path.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = segments.join("/");

    // Sanitize path to prevent directory traversal
    if (filePath.includes("..") || filePath.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
    const fullPath = path.join(uploadsDir, filePath);

    // Check if file exists
    try {
      await stat(fullPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const fileBuffer = await readFile(fullPath);
    const body = new Uint8Array(fileBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Length": String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error("Error serving upload:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
