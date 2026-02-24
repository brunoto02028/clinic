import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const maxDuration = 60;

// POST: AI-powered package creation assistant
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, serviceTypes } = await req.json();

    const serviceList = (serviceTypes || [
      { type: "CONSULTATION", label: "Consultation Booking" },
      { type: "FOOT_SCAN", label: "Foot Scan" },
      { type: "BODY_ASSESSMENT", label: "Body Assessment" },
    ]).map((s: any) => `- ${s.type}: ${s.label}`).join("\n");

    const prompt = `You are a bilingual assistant for Bruno Physical Rehabilitation (BPR), a physiotherapy clinic in London, UK.

The user wants to create a service package/plan. Parse their natural language description and extract the package details.

## LANGUAGE RULES (VERY IMPORTANT)
- "_summary" and "_questions" must be written in the SAME LANGUAGE the user wrote their message in. If user writes in Portuguese, respond in Portuguese. If in English, respond in English.
- ALL form field values ("name", "description") must ALWAYS be written in ENGLISH, regardless of what language the user wrote in. English is the system's primary language. The Portuguese translation is handled separately.
- Example: if user writes "pacote completo de reabilitação com 12 sessões", the "name" must be "Complete Rehabilitation Package" (English), the "description" must be in English, but "_summary" and "_questions" should be in Portuguese.

## AVAILABLE SERVICES
${serviceList}

## OUTPUT FORMAT
You MUST respond with a JSON object wrapped in \`\`\`json code block:

\`\`\`json
{
  "name": "Package name IN ENGLISH",
  "description": "Package description IN ENGLISH",
  "price": 0,
  "currency": "GBP",
  "includedServices": ["CONSULTATION", "FOOT_SCAN"],
  "durationDays": null,
  "sessionsIncluded": null,
  "isActive": true,
  "_summary": "Brief confirmation in USER'S LANGUAGE",
  "_questions": null
}
\`\`\`

RULES:
- "name" and "description": ALWAYS in English (British English spelling)
- "includedServices" must be an array of service type strings from the available services list above
- "durationDays": number of days the package is valid for, or null for unlimited
- "sessionsIncluded": total number of sessions included, or null for unlimited
- "price": numeric value, default 0 if not mentioned
- "currency": default "GBP"
- If the user's description is unclear or missing critical info, set "_questions" to a string with your follow-up question(s) in the user's language, and fill in what you can
- "_summary": confirmation message in the SAME language the user wrote in
- Always try to fill in as much as possible from context
- If you need to ask questions, be conversational and friendly

User message: ${message}`;

    const response = await callAI(prompt, { temperature: 0.5, maxTokens: 2048 });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Error in package AI:", error);
    return NextResponse.json({ error: error.message || "Failed to process" }, { status: 500 });
  }
}
