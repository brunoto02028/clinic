// app/api/admin/marketplace/amazon-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { query, category = "all" } = await req.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const affiliateTag = process.env.AMAZON_AFFILIATE_TAG || "bprrrehab-21";
    const geminiKey = await getConfigValue("GEMINI_API_KEY");
    const geminiModel = (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";

    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const categoryHint = category !== "all" ? `Focus on: ${category}` : "";

    const prompt = `You are an Amazon UK product specialist for a physiotherapy clinic marketplace.

Search query: "${query}"
${categoryHint}
Affiliate tag: ${affiliateTag}

Generate a list of 8-12 REAL Amazon UK products that would be genuinely useful for patients of a physiotherapy and rehabilitation clinic (BPR - Bruno Physical Rehabilitation, Richmond UK).

For each product, provide realistic data based on actual Amazon UK listings you know about.

Return ONLY a valid JSON array:
[
  {
    "name": "exact product name (concise, max 80 chars)",
    "brand": "brand name",
    "asin": "real 10-char Amazon ASIN like B0XXXXXXXX",
    "price": number in GBP (realistic UK price),
    "rating": number 1-5 (realistic),
    "reviewCount": number (realistic),
    "category": "supplement|equipment|physical_product|digital_program",
    "shortDescription": "one-line benefit for physio patients (max 70 chars)",
    "description": "2-3 sentences why this is useful for physiotherapy/rehabilitation patients",
    "imageUrl": "",
    "commission": 4,
    "tags": ["tag1", "tag2"],
    "affiliateUrl": "https://www.amazon.co.uk/dp/ASIN?tag=${affiliateTag}"
  }
]

Categories guidance:
- Vitamins, minerals, collagen, protein, omega3, glucosamine → "supplement"
- Foam rollers, resistance bands, TENS, braces, tape → "equipment"  
- Books, programs, guides → "digital_program"
- Other physical items → "physical_product"

Make the products highly relevant to: ${query}
Include popular, well-reviewed products that physiotherapy patients actually buy.
Return ONLY the JSON array, no markdown, no explanation.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 3000 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      throw new Error(`Gemini error: ${errData?.error?.message || geminiRes.statusText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonStr = rawText.replace(/```json?\n?/gi, "").replace(/```\n?/g, "").trim();

    let products: any[];
    try {
      products = JSON.parse(jsonStr);
      if (!Array.isArray(products)) throw new Error("Not an array");
    } catch {
      throw new Error("Failed to parse AI product list");
    }

    // Ensure affiliate URLs are correct
    products = products.map((p) => ({
      ...p,
      affiliateUrl: p.asin
        ? `https://www.amazon.co.uk/dp/${p.asin}?tag=${affiliateTag}`
        : p.affiliateUrl || "",
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
