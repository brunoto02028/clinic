import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { flattenToPng, isValidHexColor } from "@/lib/image-flatten";

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
    const { searchParams } = new URL(request.url);
    // Optional: ?bg=RRGGBB flattens transparency onto a solid colour and
    // forces PNG output — used for email logos (see flattenToPng above).
    // Validated up front: an invalid value used to reach the ETag header
    // unvalidated (a CRLF or other bad byte there throws when NextResponse
    // builds the Headers, which escaped this function's own try/catch).
    const bgParam = searchParams.get("bg")?.replace(/^#/, "") || null;
    if (bgParam && !isValidHexColor(bgParam)) {
      return new NextResponse(null, { status: 400 });
    }
    const bg = bgParam;

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
