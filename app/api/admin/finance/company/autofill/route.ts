import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI, parseAIJson } from "@/lib/ai-provider";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — IAPA auto-fill: use AI to suggest company profile fields
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    const body = await req.json();
    const currentProfile = body.currentProfile || {};

    // Gather clinic data and site settings for context
    const [clinic, siteSettings] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.siteSettings.findFirst({ where: { clinicId } }),
    ]);

    const clinicContext = clinic
      ? `Clinic Name: ${clinic.name || ""}
Address: ${clinic.address || ""}, ${clinic.city || ""}, ${clinic.postcode || ""}, ${clinic.country || ""}
Email: ${clinic.email || ""}
Phone: ${clinic.phone || ""}
Currency: ${clinic.currency || "GBP"}`
      : "No clinic data found.";

    const siteContext = siteSettings
      ? `Business Name: ${(siteSettings as any).businessName || ""}
Business Type: ${(siteSettings as any).businessType || ""}
Business Street: ${(siteSettings as any).businessStreet || ""}
Business City: ${(siteSettings as any).businessCity || ""}
Business Region: ${(siteSettings as any).businessRegion || ""}
Business Postcode: ${(siteSettings as any).businessPostcode || ""}
Business Country: ${(siteSettings as any).businessCountry || ""}
Business Phone: ${(siteSettings as any).businessPhone || ""}
Business Email: ${(siteSettings as any).businessEmail || ""}
Business Currency: ${(siteSettings as any).businessCurrency || ""}`
      : "";

    // Fields already filled by user
    const filledFields = Object.entries(currentProfile)
      .filter(([k, v]) => v && typeof v === "string" && v.trim() !== "" && !["id", "clinicId", "createdAt", "updatedAt"].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const prompt = `You are a UK company registration expert. Based on the clinic information below, suggest values for empty company profile fields. This is for a physiotherapy/healthcare clinic registering with Companies House in the UK.

## EXISTING CLINIC DATA
${clinicContext}

## SITE SETTINGS (Google Business Profile)
${siteContext}

## FIELDS ALREADY FILLED BY USER
${filledFields || "None — all fields are empty."}

## INSTRUCTIONS
- Fill in ONLY fields that are currently empty/missing
- Do NOT override any already-filled fields
- For fields you cannot determine with certainty, provide your best suggestion based on the clinic context
- Use UK-standard formats (e.g., postcode, phone numbers, VAT format)
- Company type for a UK physio clinic is typically "Private Limited Company"
- SIC codes for physiotherapy: "86900" (Other human health activities) is the primary one
- For date fields, use ISO format (YYYY-MM-DD)
- For directors JSON, if the owner name is known, create a director entry
- If the clinic is UK-based, country of origin should be "United Kingdom" and registered address country should be "England and Wales"
- Tax year end for UK companies is typically "31 March" unless specified otherwise
- Do NOT invent company numbers (CRN), VAT numbers, UTR, or any official registration numbers — leave those empty
- Do NOT invent bank details — leave those empty
- Do NOT invent insurance details — leave those empty

Respond with ONLY a JSON object containing the suggested fields and their values. Only include fields where you have a reasonable suggestion. Example:
{
  "companyName": "Example Ltd",
  "companyType": "Private Limited Company",
  "companyStatus": "Active",
  "regAddressLine1": "123 High Street"
}`;

    const result = await callAI(prompt, { temperature: 0.3, maxTokens: 2000 });
    const suggestions = parseAIJson(result);

    // Remove any fields that are already filled
    const cleanSuggestions: Record<string, any> = {};
    for (const [key, value] of Object.entries(suggestions)) {
      if (["id", "clinicId", "createdAt", "updatedAt"].includes(key)) continue;
      // Only suggest if the field is currently empty
      const currentVal = currentProfile[key];
      if (!currentVal || (typeof currentVal === "string" && currentVal.trim() === "")) {
        cleanSuggestions[key] = value;
      }
    }

    return NextResponse.json({ suggestions: cleanSuggestions });
  } catch (err: any) {
    console.error("[company-autofill] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
