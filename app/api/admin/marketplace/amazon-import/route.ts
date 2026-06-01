// app/api/admin/marketplace/amazon-import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import { callAI, parseAIJson } from "@/lib/ai-provider";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any)?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "Amazon URL is required" }, { status: 400 });

    // Extract ASIN from URL
    const asinMatch = url.match(/(?:\/dp\/|\/product\/|\/ASIN\/)([A-Z0-9]{10})/i)
      || url.match(/(?:amazon\.[a-z.]+\/[^/]*\/?)([A-Z0-9]{10})/i);
    const asin = asinMatch?.[1] || "";

    // Get affiliate tag from env or system config
    let affiliateTag = process.env.AMAZON_AFFILIATE_TAG || "";
    if (!affiliateTag) {
      try { affiliateTag = (await getConfigValue("AMAZON_AFFILIATE_TAG")) || ""; } catch {}
    }

    // Use AI to extract product info from the Amazon URL
    const prompt = `You are a product data extraction assistant. Given this Amazon product URL: ${url}

Extract or infer the following product information. If the URL contains an ASIN (${asin || 'unknown'}), use your knowledge of Amazon products to provide accurate details.

Return ONLY valid JSON with these fields:
{
  "name": "product name (concise, max 80 chars)",
  "description": "full product description for a clinic marketplace (2-3 sentences, professional tone)",
  "shortDescription": "one-line tagline (max 60 chars)",
  "category": "one of: physical_product, digital_program, equipment, supplement, special_session, subscription",
  "price": number (in GBP, estimate if needed),
  "imageUrl": "main product image URL if you can determine it, otherwise empty string",
  "asin": "${asin || 'extract from URL'}",
  "commission": 4.5,
  "affiliateTag": "${affiliateTag}"
}

For category, use these guidelines:
- Physiotherapy/rehab equipment, bands, rollers → "equipment"  
- Vitamins, protein, collagen, joint supplements → "supplement"
- Books, courses, digital downloads → "digital_program"
- General physical items → "physical_product"

Make the description relevant to a physiotherapy/rehabilitation clinic marketplace.
Return ONLY the JSON object, no markdown, no explanation.`;

    const rawText = await callAI(prompt, { temperature: 0.3, maxTokens: 1000 });
    const product = parseAIJson(rawText);

    // Build the affiliate URL with tag
    let affiliateUrl = url;
    if (affiliateTag && !url.includes("tag=")) {
      const separator = url.includes("?") ? "&" : "?";
      affiliateUrl = `${url}${separator}tag=${affiliateTag}`;
    }

    product.affiliateUrl = affiliateUrl;
    if (!product.affiliateTag) product.affiliateTag = affiliateTag;
    if (!product.asin) product.asin = asin;

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error("Amazon import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
