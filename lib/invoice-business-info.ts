import { prisma } from "@/lib/db";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { InvoiceBusinessInfo } from "@/lib/invoice-html";

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
    (prisma as any).siteSettings.findUnique({ where: { clinicId } }),
  ]);

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
    logoUrl: siteSettings?.logoUrl || null,
    addressLines: addressLines as string[],
    email: company?.companyEmail || clinic?.email || getSenderEmail(),
    phone: company?.companyPhone || clinic?.phone || null,
    bankName: company?.bankName || null,
    bankAccountName: company?.bankAccountName || null,
    bankSortCode: company?.bankSortCode || null,
    bankAccountNumber: company?.bankAccountNumber || null,
  };
}
