import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Flattens image bytes onto a solid background and re-encodes as PNG.
 * Used for email logos: many email clients (notably Gmail's mobile apps)
 * mis-render WebP — especially WebP with alpha transparency, which can show
 * up as a solid black box instead of transparent. Baking the intended
 * background colour into a real PNG sidesteps both problems.
 */
async function flattenToPng(buffer: Buffer, bgHex: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const hex = bgHex.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return sharp(buffer).flatten({ background: { r, g, b } }).png().toBuffer();
}

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
    const { searchParams } = new URL(request.url);
    // Optional: ?bg=RRGGBB flattens transparency onto a solid colour and
    // forces PNG output — used for email logos (see flattenToPng above).
    const bg = searchParams.get("bg");

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
      let buffer = Buffer.from(base64, "base64");
      let contentType = mimeType;

      if (bg) {
        try {
          buffer = await flattenToPng(buffer, bg);
          contentType = "image/png";
        } catch (err) {
          console.error("[image-serve] flatten error:", err);
        }
      }

      // ETag based on ID + bg (immutable content) — enables fast conditional GET
      const etag = `"${id}${bg ? `-${bg}` : ""}"`;
      if (request.headers.get("if-none-match") === etag) {
        return new NextResponse(null, { status: 304 });
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(buffer.length),
          "ETag": etag,
        },
      });
    }

    // External URL (S3, CDN, etc.) — proxy the content so Next.js <Image> works
    // without needing the host in remotePatterns
    if (image.imageUrl.startsWith('http')) {
      try {
        const upstream = await fetch(image.imageUrl, { cache: 'force-cache' });
        if (!upstream.ok) return new NextResponse(null, { status: 404 });
        let contentType = upstream.headers.get('content-type') || image.mimeType || 'image/jpeg';
        let body: Buffer | ArrayBuffer = Buffer.from(await upstream.arrayBuffer());

        if (bg) {
          try {
            body = await flattenToPng(body as Buffer, bg);
            contentType = 'image/png';
          } catch (err) {
            console.error('[image-serve] flatten error:', err);
          }
        }

        return new NextResponse(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            'Content-Length': String((body as Buffer).byteLength ?? (body as ArrayBuffer).byteLength),
          },
        });
      } catch {
        return new NextResponse(null, { status: 502 });
      }
    }
    // Relative path — redirect to same-origin
    return NextResponse.redirect(new URL(image.imageUrl, request.url));
  } catch (error) {
    console.error("Error serving image:", error);
    return new NextResponse(null, { status: 500 });
  }
}
