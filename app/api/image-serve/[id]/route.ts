import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serve images stored as base64 dataURL in the ImageLibrary table.
 * Returns the raw image bytes with the correct Content-Type header.
 * This allows settings to store a short URL (/api/image-serve/{id})
 * instead of a multi-MB base64 string.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const image = await prisma.imageLibrary.findUnique({
      where: { id },
      select: { imageUrl: true, mimeType: true, fileName: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Handle base64 dataURL: "data:image/jpeg;base64,..."
    if (image.imageUrl.startsWith("data:")) {
      const [header, base64] = image.imageUrl.split(",");
      const mimeType = header.split(";")[0].replace("data:", "") || image.mimeType;
      const buffer = Buffer.from(base64, "base64");

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(buffer.length),
        },
      });
    }

    // External URL — redirect
    return NextResponse.redirect(image.imageUrl);
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json({ error: "Failed to serve image" }, { status: 500 });
  }
}
