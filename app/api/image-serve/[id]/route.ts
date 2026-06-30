import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serve images stored as base64 dataURL in the ImageLibrary table.
 * Returns the raw image bytes with the correct Content-Type header.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await prisma.imageLibrary.findUnique({
      where: { id },
      select: { imageUrl: true, mimeType: true },
    });

    if (!image) {
      return new NextResponse(null, { status: 404 });
    }

    // Handle base64 dataURL: "data:image/webp;base64,..."
    if (image.imageUrl.startsWith("data:")) {
      const [header, base64] = image.imageUrl.split(",");
      const mimeType = header.split(";")[0].replace("data:", "") || image.mimeType;
      const buffer = Buffer.from(base64, "base64");

      // ETag based on ID (immutable content) — enables fast conditional GET
      const etag = `"${id}"`;
      if (request.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(buffer.length),
          "ETag": etag,
        },
      });
    }

    // External URL — redirect
    return NextResponse.redirect(image.imageUrl);
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse(null, { status: 500 });
  }
}
