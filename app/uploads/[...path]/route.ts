import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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
  const contentTypeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
  };
  const contentType = contentTypeMap[ext] || "application/octet-stream";

  return new NextResponse(readFileSync(resolvedPath), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
