import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public endpoint: GET all published service pages (for SiteHeader nav + service detail pages)
export async function GET() {
  try {
    const pages = await (prisma as any).servicePage.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching service pages:", error);
    return NextResponse.json([], { status: 200 });
  }
}
