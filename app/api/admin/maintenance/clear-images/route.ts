import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Report article image URLs
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-maintenance-secret");
  if (secret !== "bpr-clear-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = await prisma.article.findMany({
    select: { id: true, title: true, imageUrl: true },
    orderBy: { createdAt: "desc" },
  });

  const report = articles.map((a) => ({
    id: a.id,
    title: a.title?.slice(0, 50),
    imageUrl: a.imageUrl || null,
    type: !a.imageUrl ? "none"
      : a.imageUrl.startsWith("data:") ? "base64"
      : a.imageUrl.startsWith("/uploads/") ? "broken_local"
      : a.imageUrl.includes("unsplash.com") ? "unsplash"
      : a.imageUrl.includes("s3.amazonaws.com") ? "s3"
      : "external_url",
  }));

  const summary = report.reduce((acc: Record<string, number>, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({ summary, articles: report });
}

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

  // Apply settings updates
  if (Object.keys(updates).length > 0) {
    await prisma.siteSettings.update({
      where: { id: current.id },
      data: updates,
    });
  }

  // Delete broken ImageLibrary entries (empty URL or /uploads/ Railway paths)
  const brokenLibrary = await prisma.imageLibrary.findMany({
    where: {
      OR: [
        { imageUrl: "" },
        { imageUrl: { startsWith: "/uploads/" } },
        { imageUrl: { contains: "unsplash.com" } },
      ],
    },
    select: { id: true, imageUrl: true, originalName: true },
  });

  const deletedLibrary: string[] = [];
  for (const img of brokenLibrary) {
    await prisma.imageLibrary.delete({ where: { id: img.id } });
    deletedLibrary.push(`[${img.id.slice(0,8)}] ${img.originalName}: ${img.imageUrl.slice(0,60)}`);
  }

  return NextResponse.json({
    success: true,
    cleared,
    deletedLibraryEntries: deletedLibrary,
    message: `Cleared ${cleared.length} settings image(s), deleted ${deletedLibrary.length} broken library entry(ies)`,
  });
}
