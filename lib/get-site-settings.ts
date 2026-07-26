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

export type StartPageSettings = {
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
  siteName?: string | null;
  aboutImageUrl?: string | null;
  whatsappEnabled?: boolean;
  whatsappNumber?: string | null;
  whatsappMessage?: string | null;
} | null;

export async function getStartPageSettings(): Promise<StartPageSettings> {
  return prisma.siteSettings
    .findFirst({
      select: {
        logoUrl: true,
        darkLogoUrl: true,
        siteName: true,
        aboutImageUrl: true,
        whatsappEnabled: true,
        whatsappNumber: true,
        whatsappMessage: true,
      },
    })
    .catch(() => null);
}
