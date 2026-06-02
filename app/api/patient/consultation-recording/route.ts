import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

  // Auto-transcribe using existing transcription endpoint logic
  try {
    const { getConfigValue } = await import("@/lib/config");
    const geminiKey = await getConfigValue("GEMINI_API_KEY");

    if (geminiKey) {
      const audioBase64 = base64Audio;
      const transcribeUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const transcribeRes = await fetch(transcribeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: audioBase64 } },
              { text: `Transcribe this audio recording precisely. The patient is describing their symptoms and complaints before a physiotherapy consultation. Language: ${language === "pt" ? "Portuguese" : "English"}. Return ONLY the transcription text, nothing else.` },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      });

      if (transcribeRes.ok) {
        const transcribeData = await transcribeRes.json();
        const transcript = transcribeData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (transcript) {
          // Also extract chief complaint and symptoms
          const extractUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
          const extractRes = await fetch(extractUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `From this patient's pre-consultation recording transcript, extract:
1. A brief chief complaint (1-2 sentences summarizing the main reason for the visit)
2. A list of symptoms mentioned

Transcript: "${transcript}"

Respond in JSON format: { "chiefComplaint": "...", "symptoms": ["symptom1", "symptom2", ...] }
Respond in ${language === "pt" ? "Portuguese" : "English"}.` }],
              }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
            }),
          });

          let chiefComplaint = null;
          let symptoms = null;

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            const extractText = extractData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            try {
              const cleaned = extractText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              const parsed = JSON.parse(cleaned);
              chiefComplaint = parsed.chiefComplaint || null;
              symptoms = parsed.symptoms ? JSON.stringify(parsed.symptoms) : null;
            } catch { /* ignore parse errors */ }
          }

          // Update with transcription
          await prisma.consultationRecording.update({
            where: { id: recording.id },
            data: {
              transcript,
              transcribedAt: new Date(),
              status: "transcribed",
              chiefComplaint,
              symptoms,
            },
          });

          return NextResponse.json({
            success: true,
            recording: { ...recording, transcript, status: "transcribed", chiefComplaint, symptoms },
          });
        }
      }
    }
  } catch (err) {
    console.error("Auto-transcription failed:", err);
  }

  return NextResponse.json({ success: true, recording });
}
