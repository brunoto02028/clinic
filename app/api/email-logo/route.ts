import { NextRequest, NextResponse } from "next/server";
import { flattenToPng, isValidHexColor, resolveSameOriginUrl, DEFAULT_FLATTEN_BG } from "@/lib/image-flatten";

export const dynamic = "force-dynamic";

// Flatten-and-serve for logos that don't come from ImageLibrary (which
// already gets this via /api/image-serve?bg=...) — the static /logo.png
// bundled with the site, or a legacy /uploads/* file. Same problem, same
// fix: an email client rendering the surrounding <td>'s background
// differently than the image's own (transparent or mismatched) background
// produces a logo that looks like it's floating in a mismatched box. Baking
// the intended colour into the image itself is immune to that, since email
// clients don't recolour image pixels.
//
// Restricted to same-origin `src` only (see resolveSameOriginUrl) — this
// proxies and re-encodes whatever URL it's given, so it must never become
// an open image-fetching proxy for arbitrary external hosts. `redirect:
// "error"` on the fetch closes a second path to the same problem: a
// same-origin URL that itself redirects elsewhere (e.g. a malformed
// ImageLibrary row falling into /api/image-serve's own redirect fallback)
// would otherwise let the outer fetch follow it off-origin regardless of
// the up-front check.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const bg = (searchParams.get("bg") || DEFAULT_FLATTEN_BG).replace(/^#/, "");

  if (!src) return new NextResponse(null, { status: 400 });
  if (!isValidHexColor(bg)) return new NextResponse(null, { status: 400 });

  const resolvedUrl = resolveSameOriginUrl(src);
  if (!resolvedUrl) return new NextResponse(null, { status: 400 });

  // Fully determined by pathname+search+bg, independent of the fetched
  // bytes — check it before doing any network/CPU work, not after.
  const etag = `"${Buffer.from(resolvedUrl.pathname + resolvedUrl.search).toString("base64url")}-${bg}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  try {
    const upstream = await fetch(resolvedUrl.toString(), { cache: "force-cache", redirect: "error" });
    if (!upstream.ok) return new NextResponse(null, { status: 404 });
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const flattened = await flattenToPng(buffer, bg);

    return new NextResponse(flattened, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(flattened.length),
        "ETag": etag,
      },
    });
  } catch (err) {
    console.error("[email-logo] flatten error:", err);
    return new NextResponse(null, { status: 502 });
  }
}
