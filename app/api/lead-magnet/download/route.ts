import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logLeadMagnetEvent } from "@/lib/lead-magnet";

export const dynamic = "force-dynamic";

// GET /api/lead-magnet/download?token=...&guide=slug
// Gated by the contact's confirm token — never a public permanent link.
// Not indexable, not guessable (24-byte random token).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const guideSlug = searchParams.get("guide");
    if (!token || !guideSlug) {
      return NextResponse.json({ error: "Missing token or guide" }, { status: 400 });
    }

    const contact = await (prisma as any).emailContact.findUnique({ where: { confirmToken: token } });
    if (!contact || !contact.confirmed) {
      return NextResponse.json({ error: "Link not valid — please confirm your email first" }, { status: 403 });
    }

    const guide = await (prisma as any).leadMagnetGuide.findUnique({ where: { slug: guideSlug } });
    if (!guide || !guide.isActive) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    await logLeadMagnetEvent(contact.id, "downloaded", { guideSlug });

    const isPt = (contact.language || "en") === "pt";
    const base64 = isPt ? guide.pdfDataPt : guide.pdfDataEn;
    const buffer = Buffer.from(base64, "base64");
    const filename = `bpr-${guide.slug}-${isPt ? "pt" : "en"}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[lead-magnet/download] error:", error);
    return NextResponse.json({ error: "Failed to download guide" }, { status: 500 });
  }
}
