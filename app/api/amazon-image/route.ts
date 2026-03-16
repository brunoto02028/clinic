import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side Amazon image proxy.
 * ssl-images-amazon.com returns 200 from the server (verified).
 * Browser can't load it directly due to CSP — we proxy it.
 * Usage: /api/amazon-image?asin=B00020IBVC&cat=supplement
 */

const CATEGORY_FALLBACKS: Record<string, string> = {
  supplement: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80&auto=format&fit=crop",
  equipment: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&q=80&auto=format&fit=crop",
  digital_program: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80&auto=format&fit=crop",
  physical_product: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80&auto=format&fit=crop",
};

// In-memory cache: asin -> { arrayBuffer, contentType, timestamp }
const CACHE = new Map<string, { ab: ArrayBuffer; ct: string; ts: number }>();
const TTL = 86_400_000; // 24h

export async function GET(req: NextRequest) {
  const asin = req.nextUrl.searchParams.get("asin") || "";
  const cat = req.nextUrl.searchParams.get("cat") || "supplement";
  const fallback = CATEGORY_FALLBACKS[cat] || CATEGORY_FALLBACKS.supplement;

  if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.redirect(fallback);
  }

  // Serve from cache
  const hit = CACHE.get(asin);
  if (hit && Date.now() - hit.ts < TTL) {
    return new NextResponse(hit.ab, {
      headers: { "Content-Type": hit.ct, "Cache-Control": "public, max-age=86400" },
    });
  }

  // Try Amazon CDN — returns 200 from server (verified), just not from browser
  const amazonUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01.LZZZZZZZ.jpg`;
  try {
    const res = await fetch(amazonUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Referer": "https://www.amazon.co.uk/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const ct = res.headers.get("content-type") || "image/jpeg";
      if (ct.startsWith("image/")) {
        const ab = await res.arrayBuffer();
        if (ab.byteLength > 2000) {
          CACHE.set(asin, { ab, ct, ts: Date.now() });
          return new NextResponse(ab, {
            headers: { "Content-Type": ct, "Cache-Control": "public, max-age=86400" },
          });
        }
      }
    }
  } catch {
    // fall through to Unsplash fallback
  }

  return NextResponse.redirect(fallback);
}
