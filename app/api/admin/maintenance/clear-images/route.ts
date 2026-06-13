import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// One-time maintenance endpoint to clear broken/placeholder image URLs
// DELETE after use
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-maintenance-secret");
  if (secret !== "bpr-clear-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current settings to inspect
  const current = await prisma.siteSettings.findFirst();
  if (!current) {
    return NextResponse.json({ error: "No settings found" }, { status: 404 });
  }

  // Clear all placeholder/broken image URLs
  // Unsplash URLs are placeholders — clear them
  // /uploads/ paths are from Railway filesystem — lost, clear them
  const isPlaceholderOrBroken = (url: string | null) => {
    if (!url) return false;
    return url.includes("unsplash.com") || url.startsWith("/uploads/");
  };

  const updates: Record<string, null> = {};
  const cleared: string[] = [];

  const imageFields = [
    "heroImageUrl", "aboutImageUrl", "logoUrl", "darkLogoUrl",
    "faviconUrl", "insolesImageUrl", "bioImageUrl", "thermoImageUrl",
  ] as const;

  for (const field of imageFields) {
    const val = (current as any)[field];
    if (isPlaceholderOrBroken(val)) {
      updates[field] = null;
      cleared.push(`${field}: ${val}`);
    }
  }

  // Fix mlsLaserJson — remove broken deviceImage
  if (current.mlsLaserJson) {
    try {
      const mls = JSON.parse(current.mlsLaserJson);
      if (isPlaceholderOrBroken(mls.deviceImage)) {
        cleared.push(`mlsLaserJson.deviceImage: ${mls.deviceImage}`);
        delete mls.deviceImage;
        (updates as any).mlsLaserJson = JSON.stringify(mls);
      }
    } catch {}
  }

  // Apply updates
  await prisma.siteSettings.update({
    where: { id: current.id },
    data: updates,
  });

  return NextResponse.json({
    success: true,
    cleared,
    message: `Cleared ${cleared.length} broken/placeholder image(s)`,
  });
}
