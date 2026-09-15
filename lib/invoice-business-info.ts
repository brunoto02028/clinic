import { prisma } from "@/lib/db";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { InvoiceBusinessInfo } from "@/lib/invoice-html";

// SiteSettings.logoUrl is usually a site-relative path (e.g. "/logo.png") —
// resolves fine inside the app but breaks in an emailed/standalone HTML
// attachment, which has no base URL to resolve it against. Same fix the
// email templates already apply (lib/email-templates.ts's toAbs).
function toAbsoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("http")) return url;
  const base = process.env.NEXTAUTH_URL || "https://bpr.clinic";
  return `${base}${url}`;
}

/** Gathers the clinic's business/bank/logo info for an invoice — same source
 * of truth (CompanyProfile, falling back to Clinic + SiteSettings) used by
 * every invoice-generating route, so they never drift from each other. */
export async function getInvoiceBusinessInfo(clinicId: string): Promise<InvoiceBusinessInfo> {
  const [company, clinic, siteSettings] = await Promise.all([
    (prisma as any).companyProfile.findUnique({ where: { clinicId } }),
    prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, address: true, city: true, postcode: true, phone: true, email: true },
    }),
    // SiteSettings has no real per-clinic scoping in this app today — every
    // other reader (app/api/settings, lib/email-templates.ts) treats it as
    // a single global row via findFirst(), not a findUnique by clinicId.
    (prisma as any).siteSettings.findFirst(),
  ]);

  const screenLogos = (siteSettings as any)?.screenLogos as { emailHeader?: { logoUrl?: string } } | null | undefined;
  const rawLogoUrl = screenLogos?.emailHeader?.logoUrl || siteSettings?.logoUrl || null;

  const addressLines = company
    ? [
        company.tradAddressLine1 || company.regAddressLine1,
        company.tradAddressLine2 || company.regAddressLine2,
        [company.tradAddressCity || company.regAddressCity, company.tradAddressPostcode || company.regAddressPostcode].filter(Boolean).join(", "),
      ].filter(Boolean)
    : [clinic?.address, [clinic?.city, clinic?.postcode].filter(Boolean).join(", ")].filter(Boolean);

  return {
    name: company?.companyName || getAppName(),
    tradingName: company?.tradingName || getAppName(),
    logoUrl: toAbsoluteUrl(rawLogoUrl),
    addressLines: addressLines as string[],
    email: company?.companyEmail || clinic?.email || getSenderEmail(),
    phone: company?.companyPhone || clinic?.phone || null,
    bankName: company?.bankName || null,
    bankAccountName: company?.bankAccountName || null,
    bankSortCode: company?.bankSortCode || null,
    bankAccountNumber: company?.bankAccountNumber || null,
  };
}
