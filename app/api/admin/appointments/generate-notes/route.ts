import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientName, treatmentType, duration, instructions } = await req.json();

  const geminiKey = await getConfigValue("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "AI not configured. Add GEMINI_API_KEY in AI Settings." }, { status: 500 });
  }
  const geminiModel = (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";

  const prompt = `You are a clinical notes generator for a physiotherapy clinic (Bruno Physical Rehabilitation - BPR).
Generate professional appointment notes for:
- Patient: ${patientName}
- Treatment: ${treatmentType}
- Duration: ${duration} minutes

${instructions ? `Additional instructions from the therapist:\n${instructions}\n` : ''}

Write 3-5 sentences covering:
1. Purpose of this session
2. What will be assessed/treated
3. Any preparation the patient should do (arrive early, wear comfortable clothes, bring medical records, etc.)
4. ${instructions ? 'Include the therapist\'s additional instructions above' : 'Remind patient to complete their medical screening form before the appointment if not done yet'}

Write in English. Return ONLY the notes text, no markdown, no formatting, no JSON.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ notes: text.trim() });
  } catch (e: any) {
    console.error("AI notes generation error:", e);
    return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
  }
}
