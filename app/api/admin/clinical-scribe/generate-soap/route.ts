import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAIClinical, parseAIJson } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transcript, patientId, appointmentType, language } = await req.json();

  if (!transcript) {
    return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
  }

  // Get patient context if provided
  let patientContext = "";
  if (patientId) {
    try {
      const patient: any = await prisma.user.findUnique({
        where: { id: patientId },
        include: {
          medicalScreening: true,
          soapNotesFor: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      });

      if (patient) {
        patientContext = `\n\nPATIENT CONTEXT:
- Name: ${patient.firstName} ${patient.lastName}`;

        if (patient.medicalScreening?.responses) {
          const screening = patient.medicalScreening.responses as any;
          const conditions = screening.medicalConditions || screening.conditions;
          if (conditions) patientContext += `\n- Medical History: ${JSON.stringify(conditions).slice(0, 500)}`;
        }

        if (patient.soapNotesFor?.length > 0) {
          patientContext += `\n\nPREVIOUS NOTES (most recent ${patient.soapNotesFor.length}):`;
          patient.soapNotesFor.forEach((note: any, i: number) => {
            const date = new Date(note.createdAt).toLocaleDateString("en-GB");
            patientContext += `\n[${date}] S: ${note.subjective?.slice(0, 150)}... | A: ${note.assessment?.slice(0, 150)}... | P: ${note.plan?.slice(0, 150)}...`;
          });
        }
      }
    } catch (err) {
      console.warn("[clinical-scribe] Failed to fetch patient context:", err);
    }
  }

  const lang = language === "pt" ? "Portuguese (Brazil)" : "English";

  const prompt = `You are an expert clinical documentation AI for a physical rehabilitation clinic (Bruno Physical Rehabilitation - BPR).

Your task: Convert the following consultation audio transcription into a structured SOAP note.

TRANSCRIPTION:
"""
${transcript}
"""
${patientContext}

APPOINTMENT TYPE: ${appointmentType || "General physical rehabilitation consultation"}

INSTRUCTIONS:
1. Extract and structure the information from the transcription into SOAP format
2. Use professional clinical language appropriate for healthcare documentation
3. If information is unclear or missing from the transcription, note it as "Not discussed" or "To be assessed"
4. Include specific measurements, ranges, and findings mentioned
5. Write in ${lang}
6. Be concise but thorough — each section should be 2-5 sentences
7. The Plan section should include specific treatment actions, exercises prescribed, and follow-up schedule

Return a JSON object with these EXACT fields:
{
  "subjective": "Patient's reported symptoms, concerns, history of present condition, pain descriptions, functional limitations mentioned",
  "objective": "Clinical findings, measurements, ROM, strength tests, palpation findings, special tests, observation notes",
  "assessment": "Clinical reasoning, diagnosis/working hypothesis, severity, prognosis, contributing factors, response to previous treatment",
  "plan": "Treatment performed today, home exercises prescribed, frequency of sessions, goals, referrals, follow-up timeline",
  "painLevel": number or null (0-10 if mentioned),
  "rangeOfMotion": "specific ROM findings if mentioned, or null",
  "functionalTests": "specific tests performed and results, or null",
  "treatmentNotes": "specific treatments/modalities applied during this session",
  "summary": "One-sentence clinical summary suitable for quick reference"
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const rawResponse = await callAIClinical(prompt, {
      temperature: 0.3,
      maxTokens: 4096,
    });

    const soapData = parseAIJson(rawResponse);

    if (!soapData || !soapData.subjective) {
      return NextResponse.json({ error: "AI failed to generate valid SOAP note. Please try again." }, { status: 422 });
    }

    return NextResponse.json({
      soap: soapData,
      provider: "ai",
    });
  } catch (error: any) {
    console.error("[clinical-scribe] SOAP generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
