import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The digital half of the business card: one tap on /start and Bruno is in the
 * visitor's phone — name, number, site and photo. A scanned card gets lost;
 * a saved contact is what the card was for in the first place.
 *
 * Values come from SiteSettings so the admin panel stays the source of truth;
 * the fallbacks match what is printed on the physical card today.
 */
export async function GET() {
  const settings = await prisma.siteSettings
    .findFirst({
      select: {
        siteName: true,
        whatsappNumber: true,
        phone: true,
        email: true,
        aboutImageUrl: true,
      },
    })
    .catch(() => null);

  const org = settings?.siteName || "BPR Physical Rehabilitation";
  // No hardcoded fallback: never emit a personal number the settings don't carry.
  const tel = settings?.whatsappNumber || settings?.phone || "";
  const email = settings?.email || "admin@bpr.clinic";

  // The photo makes the saved contact recognisable — the whole point for
  // someone who met Bruno in person. Downscaled hard: vCards travel whole.
  let photoLine = "";
  try {
    const photoUrl = settings?.aboutImageUrl
      ? settings.aboutImageUrl.startsWith("http")
        ? settings.aboutImageUrl
        : `https://bpr.clinic${settings.aboutImageUrl}`
      : null;
    if (photoUrl) {
      const res = await fetch(photoUrl);
      if (res.ok) {
        const sharp = (await import("sharp")).default;
        const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize(240, 240, { fit: "cover" })
          .jpeg({ quality: 78 })
          .toBuffer();
        photoLine = `PHOTO;ENCODING=b;TYPE=JPEG:${jpeg.toString("base64")}\n`;
      }
    }
  } catch {
    // A contact without a photo still does its job.
  }

  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:;Bruno;;;",
    `FN:Bruno — ${org}`,
    `ORG:${org}`,
    "TITLE:Rehabilitation Specialist",
    tel ? `TEL;TYPE=CELL:${tel}` : "",
    `EMAIL:${email}`,
    "URL:https://bpr.clinic/start",
    "ADR;TYPE=WORK:;;;Ipswich;Suffolk;;United Kingdom",
    photoLine.trim(),
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");

  return new NextResponse(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bruno-bpr.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
