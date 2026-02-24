import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

const CH_BASE = "https://api.company-information.service.gov.uk";

async function getApiKey(): Promise<string | null> {
  return await getConfigValue("COMPANIES_HOUSE_API_KEY");
}

async function chFetch(path: string, apiKey: string) {
  const res = await fetch(`${CH_BASE}${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Companies House API ${res.status}: ${text}`);
  }
  return res.json();
}

// GET — Search companies or fetch a specific company profile
// ?q=search_term  OR  ?number=12345678
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return NextResponse.json({
        error: "Companies House API key not configured. Go to Settings → API Keys and add your COMPANIES_HOUSE_API_KEY (free at developer.company-information.service.gov.uk).",
      }, { status: 400 });
    }

    const url = req.nextUrl;
    const query = url.searchParams.get("q");
    const companyNumber = url.searchParams.get("number");

    // ─── Fetch full company profile by number ───
    if (companyNumber) {
      const num = companyNumber.trim().padStart(8, "0");

      // Fetch profile, officers, and filing history in parallel
      const [profile, officersData] = await Promise.all([
        chFetch(`/company/${num}`, apiKey),
        chFetch(`/company/${num}/officers`, apiKey).catch(() => ({ items: [] })),
      ]);

      // Map to our CompanyProfile fields
      const mapped: Record<string, any> = {
        companyName: profile.company_name || "",
        companyNumber: profile.company_number || num,
        companyType: mapCompanyType(profile.type),
        companyStatus: capitalise(profile.company_status),
        dateOfIncorporation: profile.date_of_creation || null,
        countryOfOrigin: profile.jurisdiction || "United Kingdom",

        // SIC codes
        sicCodes: (profile.sic_codes || []).join(", "),
        sicDescriptions: (profile.sic_codes || []).map((c: string) => SIC_LOOKUP[c] || c).join(", "),

        // Registered address
        regAddressLine1: profile.registered_office_address?.address_line_1 || "",
        regAddressLine2: profile.registered_office_address?.address_line_2 || "",
        regAddressCity: profile.registered_office_address?.locality || "",
        regAddressCounty: profile.registered_office_address?.region || "",
        regAddressPostcode: profile.registered_office_address?.postal_code || "",
        regAddressCountry: profile.registered_office_address?.country || "England",

        // Filing dates
        nextAccountsDue: profile.accounts?.next_due || null,
        lastAccountsFiled: profile.accounts?.last_accounts?.made_up_to || null,
        nextConfirmationDue: profile.confirmation_statement?.next_due || null,
        lastConfirmationFiled: profile.confirmation_statement?.last_made_up_to || null,

        // Accounting period
        accountingPeriodEnd: profile.accounts?.next_accounts?.period_end_on || null,
        accountingPeriodStart: profile.accounts?.next_accounts?.period_start_on || null,
        taxYearEnd: profile.accounts?.accounting_reference_date
          ? `${profile.accounts.accounting_reference_date.day} ${monthName(profile.accounts.accounting_reference_date.month)}`
          : "",

        // Directors
        directorsJson: JSON.stringify(
          (officersData.items || [])
            .filter((o: any) => !o.resigned_on)
            .map((o: any) => ({
              name: o.name || "",
              role: o.officer_role ? capitalise(o.officer_role.replace(/_/g, " ")) : "Director",
              appointedDate: o.appointed_on || "",
              nationality: o.nationality || "",
              occupation: o.occupation || "",
              address: formatOfficerAddress(o.address),
            })),
          null, 2
        ),

        // Secretary
        secretaryName: (officersData.items || [])
          .find((o: any) => o.officer_role === "secretary" && !o.resigned_on)?.name || "",
      };

      return NextResponse.json({ profile: mapped, raw: profile });
    }

    // ─── Search companies by name ───
    if (query) {
      const data = await chFetch(`/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`, apiKey);
      const results = (data.items || []).map((item: any) => ({
        companyName: item.title,
        companyNumber: item.company_number,
        companyType: item.company_type,
        companyStatus: item.company_status,
        dateOfCreation: item.date_of_creation,
        address: item.address_snippet,
      }));
      return NextResponse.json({ results, total: data.total_results || 0 });
    }

    return NextResponse.json({ error: "Provide ?q=search_term or ?number=12345678" }, { status: 400 });
  } catch (err: any) {
    console.error("[company-search] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ───

function capitalise(s: string | undefined): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/-/g, " ");
}

function mapCompanyType(type: string | undefined): string {
  const map: Record<string, string> = {
    ltd: "Private Limited Company",
    "private-limited-guarant-nsc-limited-exemption": "Private Limited Company",
    "private-limited-guarant-nsc": "Private Limited Company",
    "private-limited-shares-section-30-exemption": "Private Limited Company",
    plc: "Public Limited Company",
    "private-unlimited": "Private Unlimited Company",
    "private-unlimited-nsc": "Private Unlimited Company",
    llp: "Limited Liability Partnership",
    "scottish-partnership": "Partnership",
    "registered-society-non-jurisdictional": "Registered Society",
    "industrial-and-provident-society": "Industrial & Provident Society",
    "community-interest-company": "Community Interest Company",
  };
  return map[type || ""] || capitalise(type);
}

function monthName(m: string | number): string {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const idx = typeof m === "string" ? parseInt(m) - 1 : m - 1;
  return months[idx] || String(m);
}

function formatOfficerAddress(addr: any): string {
  if (!addr) return "";
  return [addr.premises, addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code, addr.country]
    .filter(Boolean).join(", ");
}

// Common SIC codes for healthcare/physio clinics
const SIC_LOOKUP: Record<string, string> = {
  "86101": "Hospital activities",
  "86102": "Medical nursing home activities",
  "86210": "General medical practice activities",
  "86220": "Specialist medical practice activities",
  "86230": "Dental practice activities",
  "86900": "Other human health activities",
  "96040": "Physical well-being activities",
  "85600": "Educational support activities",
  "93110": "Operation of sports facilities",
  "93130": "Fitness facilities",
  "93199": "Other sports activities",
  "47740": "Retail sale of medical and orthopaedic goods",
  "82990": "Other business support service activities",
  "62012": "Business and domestic software development",
  "62020": "Information technology consultancy activities",
  "63120": "Web portals",
};
