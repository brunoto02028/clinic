import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAIClinical } from "@/lib/ai-provider";
import { patientPseudonym } from "@/lib/pseudonymize";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { patientName, patientId, treatmentType, duration, instructions } = await req.json();

  const prompt = `You are a clinical notes generator for a physical rehabilitation clinic (Bruno Physical Rehabilitation - BPR).
Generate professional appointment notes for:
- Patient: ${patientId ? patientPseudonym(patientId) : "the patient"}
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
    const text = await callAIClinical(prompt, { temperature: 0.7, maxTokens: 512 });
    return NextResponse.json({ notes: text.trim() });
  } catch (e: any) {
    console.error("AI notes generation error:", e);
    return NextResponse.json({ error: "Failed to generate notes" }, { status: 500 });
  }
}
