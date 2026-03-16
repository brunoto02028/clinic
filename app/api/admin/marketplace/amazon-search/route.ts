// app/api/admin/marketplace/amazon-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import * as https from "https";
import * as zlib from "zlib";

// Use native https module — confirmed working on VPS (fetch gets blocked by Amazon, https doesn't)
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          "Accept": "text/html",
          "Accept-Language": "en-GB,en;q=0.9",
        },
      },
      (res) => {
        // Follow redirects
        if ([301, 302, 303, 307].includes(res.statusCode ?? 0) && res.headers.location) {
          res.resume();
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : `https://${parsed.hostname}${res.headers.location}`;
          return httpsGet(next).then(resolve).catch(reject);
        }
        if ((res.statusCode ?? 0) >= 400) {
          res.resume();
          return resolve("");
        }
        const chunks: any[] = [];
        res.on("data", (c: any) => chunks.push(c));
        res.on("end", () => {
          const buf: any = Buffer.concat(chunks);
          const enc = res.headers["content-encoding"];
          const decompress = (cb: (e: any, d: any) => void) => {
            if (enc === "gzip") zlib.gunzip(buf, cb);
            else if (enc === "br") zlib.brotliDecompress(buf, cb);
            else if (enc === "deflate") zlib.inflate(buf, cb);
            else cb(null, buf);
          };
          decompress((e, d) => e ? reject(e) : resolve(d.toString()));
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

// Scrape Amazon search results page — returns list of { asin, name, price, rating, reviewCount, imageUrl }
async function scrapeAmazonSearch(query: string, maxResults = 10): Promise<any[]> {
  try {
    const html = await httpsGet(`https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}`);
    if (!html) return [];

    // Check for captcha/block
    if (html.includes("api-services-support@amazon.com") || html.includes("Type the characters")) return [];

    const products: any[] = [];
    // Extract all unique ASINs from search page
    const asinMatches = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)];
    const asins = [...new Set(asinMatches.map(m => m[1]).filter(a => a && a !== "0000000000"))].slice(0, maxResults);

    for (const asin of asins) {
      const asinIdx = html.indexOf(`data-asin="${asin}"`);
      if (asinIdx === -1) continue;
      const chunk = html.substring(asinIdx, asinIdx + 5000);

      // Title: h2 tag is most reliable on Amazon search results
      const h2Match = chunk.match(/<h2[^>]*>([\s\S]{0,600}?)<\/h2>/);
      const h2Text = h2Match ? h2Match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
      const name = h2Text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#[0-9]+;/g, "").substring(0, 120) || "";

      // Extract price — Amazon with Googlebot renders price in <span class="a-offscreen">£xx.xx</span>
      // Search up to 12000 chars from ASIN position; skip RRP values
      const globalPriceChunk = html.substring(asinIdx, asinIdx + 12000);
      const offscreenPrices = [...globalPriceChunk.matchAll(/<span class="a-offscreen">£([0-9,]+\.[0-9]{2})<\/span>/g)];
      const realPrice = offscreenPrices.find(m => !globalPriceChunk.substring(0, m.index!).match(/RRP\s*$|rrp\s*$|was\s*$/i));
      const price = realPrice ? parseFloat(realPrice[1].replace(/,/g, "")) : 0;

      // Extract rating
      const ratingMatch = chunk.match(/([0-9]\.[0-9]) out of 5/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 4.0;

      // Extract review count
      const reviewMatch = chunk.match(/([0-9,]+) ratings/) || chunk.match(/([0-9,]+) reviews/);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, "")) : 0;

      // Image: look in chunk first, then search whole page for this ASIN's image
      const imgInChunk = chunk.match(/src="(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+%]+\._AC_[A-Z0-9_]+\.jpg)"/);
      let imageUrl = imgInChunk?.[1]
        ? imgInChunk[1].replace(/_AC_[A-Z0-9_]+\.jpg$/, "._AC_SL500_.jpg")
        : "";
      if (!imageUrl) {
        // Search globally: Amazon sometimes puts images outside the ASIN chunk
        const globalImgMatch = html.match(new RegExp(
          `data-asin="${asin}"[\\s\\S]{0,8000}?src="(https://m\\.media-amazon\\.com/images/I/[A-Za-z0-9+%]+\\._AC_[A-Z0-9_]+\\.jpg)"`
        ));
        if (globalImgMatch?.[1]) imageUrl = globalImgMatch[1].replace(/_AC_[A-Z0-9_]+\.jpg$/, "._AC_SL500_.jpg");
      }

      if (asin) {
        products.push({ asin, name, price, rating, reviewCount, imageUrl });
      }
    }
    return products;
  } catch {
    return [];
  }
}


export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || ![("ADMIN"), "SUPERADMIN"].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query, category = "all" } = await req.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || "bprrrehab-21";
    const categoryHint = category !== "all" ? `Focus on category: ${category}.` : "";

    // Guess category from query keywords
    const qLower = query.toLowerCase();
    const guessCategory = (name: string) => {
      const n = (name + " " + qLower).toLowerCase();
      if (/vitamin|mineral|omega|collagen|protein|magnesium|glucosamine|supplement|capsule|tablet|softgel|fish oil|cod liver/.test(n)) return "supplement";
      if (/foam roller|tens|resistance band|brace|tape|splint|massage|physio|rehab|exercise|roller|band|strap/.test(n)) return "equipment";
      return "supplement";
    };

    // Scrape real ASINs + images from Amazon search (fast ~3-5s)
    const realProducts = await scrapeAmazonSearch(query, 10);

    if (realProducts.length === 0) {
      return NextResponse.json({ error: "Não foi possível encontrar produtos. Tenta pesquisar em inglês (ex: 'vitamin d3 supplement')." }, { status: 404 });
    }

    const products = realProducts.map((p) => ({
      asin: p.asin,
      name: p.name || "",
      brand: "",
      price: p.price || 9.99,
      rating: p.rating || 4.0,
      reviewCount: p.reviewCount || 0,
      category: guessCategory(p.name || ""),
      shortDescription: "",
      description: "",
      imageUrl: p.imageUrl || "",
      commission: 4,
      tags: [],
      affiliateUrl: `https://www.amazon.co.uk/dp/${p.asin}?tag=${affiliateTag}`,
      affiliateTag,
    }));

    return NextResponse.json({ success: true, products, query, affiliateTag });
  } catch (error) {
    console.error("Amazon search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
