import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const { businessInfo } = await req.json();

    const prompt = `Generate comprehensive Terms of Use and Privacy Policy for a physical rehabilitation clinic with the following details:

Business Name: ${businessInfo.name || "BPR Physical Rehabilitation"}
Location: ${businessInfo.location || "Ipswich, Suffolk, UK"}
Services: ${businessInfo.services || "Physical therapy, sports rehabilitation, MLS Laser therapy, thermography, biomechanics, insoles"}
Contact Email: ${businessInfo.email || "info@bpr.rehab"}
Contact Phone: ${businessInfo.phone || "+44 (0) XXXX XXXXXX"}
Address: ${businessInfo.address || "Ipswich, Suffolk, UK"}

Requirements:
1. Create in PLAIN TEXT format (no HTML tags)
2. Use clear section numbering (1., 1.1, 1.2, etc.)
3. Use bullet points with • symbol
4. Use ━ for section dividers
5. Include:
   - Terms of Use (acceptance, services, appointments, payment, liability)
   - Privacy Policy (UK GDPR compliant, data collection, rights, retention)
   - Contact information
   - Consent statement
6. Professional, clear, and legally sound
7. Specific to UK healthcare regulations
8. Medical records retention: 8 years minimum
9. 24-hour cancellation policy
10. Last Updated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}

Format exactly like this structure:
TERMS OF USE & PRIVACY POLICY

Last Updated: [date]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TERMS OF USE

1.1 Section Title
Content here...

• Bullet point
• Bullet point

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. PRIVACY POLICY
...`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a legal expert specializing in UK healthcare regulations, GDPR, and terms of service. Generate clear, professional, and legally compliant documents in plain text format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const generatedTerms = completion.choices[0].message.content;

    return NextResponse.json({
      success: true,
      terms: generatedTerms,
    });
  } catch (error: any) {
    console.error("Error generating terms:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate terms" },
      { status: 500 }
    );
  }
}
