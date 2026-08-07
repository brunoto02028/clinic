import { prisma } from "@/lib/db";

export type SiteSettingsLogo = {
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  screenLogos?: any;
  siteName?: string | null;
} | null;

export async function getSiteSettingsLogo(): Promise<SiteSettingsLogo> {
  return prisma.siteSettings
    .findFirst({
      select: { logoUrl: true, darkLogoUrl: true, screenLogos: true, siteName: true },
    })
    .catch(() => null);
}

export type StartTestimonial = { quoteEn: string; quotePt: string; nameEn: string; namePt: string };

export type StartPageSettings = {
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  siteName?: string | null;
  aboutImageUrl?: string | null;
  whatsappEnabled?: boolean;
  whatsappNumber?: string | null;
  whatsappMessage?: string | null;
  startIntroVideoUrl?: string | null;
  startTestimonials?: StartTestimonial[];
} | null;

export async function getStartPageSettings(): Promise<StartPageSettings> {
  const row = await prisma.siteSettings
    .findFirst({
      select: {
        logoUrl: true,
        darkLogoUrl: true,
        siteName: true,
        aboutImageUrl: true,
        whatsappEnabled: true,
        whatsappNumber: true,
        whatsappMessage: true,
        startIntroVideoUrl: true,
        startTestimonialsJson: true,
      },
    })
    .catch(() => null);
  if (!row) return null;

  let startTestimonials: StartTestimonial[] = [];
  if (row.startTestimonialsJson) {
    try {
      startTestimonials = JSON.parse(row.startTestimonialsJson);
    } catch {
      startTestimonials = [];
    }
  }

  const { startTestimonialsJson: _startTestimonialsJson, ...rest } = row;
  return { ...rest, startTestimonials };
}
