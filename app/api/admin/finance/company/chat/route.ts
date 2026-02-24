import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAIChat } from "@/lib/ai-provider";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — AI chat about company profile fields
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
    const { messages, currentProfile } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    // Gather clinic context
    const [clinic, siteSettings] = await Promise.all([
      prisma.clinic.findUnique({ where: { id: clinicId } }),
      prisma.siteSettings.findFirst({ where: { clinicId } }),
    ]);

    const clinicContext = clinic
      ? `Clinic: ${clinic.name || ""}, ${clinic.address || ""}, ${clinic.city || ""}, ${clinic.postcode || ""}, ${clinic.country || ""}, Email: ${clinic.email || ""}, Phone: ${clinic.phone || ""}`
      : "";

    const profileSummary = currentProfile
      ? Object.entries(currentProfile)
          .filter(([k, v]) => v && typeof v === "string" && v.trim() !== "" && !["id", "clinicId", "createdAt", "updatedAt"].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "No fields filled yet.";

    const systemPrompt = `You are an expert UK company registration assistant helping a physiotherapy/healthcare clinic fill out their Companies House company profile. You have knowledge of UK company law, HMRC tax registration, VAT schemes, SIC codes, and company compliance requirements.

## CURRENT CLINIC DATA
${clinicContext}

## CURRENT COMPANY PROFILE FIELDS
${profileSummary || "All fields are empty."}

## YOUR ROLE
- Answer questions about UK company registration, Companies House, HMRC, VAT, SIC codes, etc.
- Help the user understand what each field means and what value to enter
- Suggest appropriate values based on the clinic context when asked
- Be concise and practical — the user is filling out a form
- If asked to auto-fill, explain what you would suggest for each empty field
- NEVER invent official numbers (CRN, VAT, UTR, NI) — tell the user to get these from official sources
- NEVER invent bank details or insurance details
- Respond in the same language the user writes in (English or Portuguese)`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const reply = await callAIChat(aiMessages, { temperature: 0.4, maxTokens: 1500 });

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("[company-chat] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
