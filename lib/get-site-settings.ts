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
