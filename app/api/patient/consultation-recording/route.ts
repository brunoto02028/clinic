import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — List patient's own recordings
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const recordings = await prisma.consultationRecording.findMany({
    where: { patientId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ recordings });
}

// POST — Patient uploads a pre-consultation audio recording
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const clinicId = (session.user as any).clinicId;

  const formData = await req.formData();
  const audioFile = formData.get("audio") as File | null;
  const appointmentId = formData.get("appointmentId") as string | null;
  const language = (formData.get("language") as string) || "en";
  const duration = formData.get("duration") ? parseInt(formData.get("duration") as string) : null;

  if (!audioFile) {
    return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
  }

  // Convert audio to base64 for storage (in production, use S3/Cloudinary)
  const arrayBuffer = await audioFile.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = audioFile.type || "audio/webm";
  const audioUrl = `data:${mimeType};base64,${base64Audio}`;

  // Create the recording
  const recording = await prisma.consultationRecording.create({
    data: {
      patientId: userId,
      appointmentId: appointmentId || null,
      clinicId: clinicId || null,
      audioUrl,
      duration,
      language,
      status: "pending",
    },
  });

  // Auto-transcribe using unified AI provider
  try {
    const { transcribeAudioMinimax, callAI } = await import("@/lib/ai-provider");
    const audioBuffer = Buffer.from(arrayBuffer);

    // 1. Transcribe: Minimax STT primary → Gemini fallback
    let transcript: string | null = null;
    try {
      transcript = await transcribeAudioMinimax(audioBuffer, mimeType, language);
    } catch (err: any) {
      console.warn("[consultation-recording] Minimax STT failed:", err.message);
    }

    if (!transcript) {
      // Gemini fallback
      const { getConfigValue } = await import("@/lib/system-config");
      const geminiKey = await getConfigValue("GEMINI_API_KEY");
      if (geminiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [
              { inlineData: { mimeType, data: base64Audio } },
              { text: `Transcribe this audio precisely. Language: ${language === "pt" ? "Portuguese" : "English"}. Return ONLY the transcription.` },
            ]}],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          transcript = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        }
      }
    }

    if (transcript) {
      // 2. Extract chief complaint + symptoms via unified callAI
      let chiefComplaint = null;
      let symptoms = null;
      try {
        const extractText = await callAI(
          `From this patient's pre-consultation recording transcript, extract:\n1. A brief chief complaint (1-2 sentences)\n2. A list of symptoms mentioned\n\nTranscript: "${transcript}"\n\nRespond in JSON: { "chiefComplaint": "...", "symptoms": ["..."] }\nRespond in ${language === "pt" ? "Portuguese" : "English"}.`,
          { temperature: 0.2, maxTokens: 1024 }
        );
        const cleaned = extractText.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned.match(/\{[\s\S]*\}/)?.[0] || "{}");
        chiefComplaint = parsed.chiefComplaint || null;
        symptoms = parsed.symptoms ? JSON.stringify(parsed.symptoms) : null;
      } catch { /* ignore parse errors */ }

      await prisma.consultationRecording.update({
        where: { id: recording.id },
        data: { transcript, transcribedAt: new Date(), status: "transcribed", chiefComplaint, symptoms },
      });

      return NextResponse.json({
        success: true,
        recording: { ...recording, transcript, status: "transcribed", chiefComplaint, symptoms },
      });
    }
  } catch (err) {
    console.error("Auto-transcription failed:", err);
  }

  return NextResponse.json({ success: true, recording });
}
