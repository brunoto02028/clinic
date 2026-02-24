import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

// Gemini Flash pricing: ~$0.075 per minute of audio
const GEMINI_COST_PER_MINUTE_USD = 0.075;
const MARGIN_PERCENT = 20;

// POST — Patient sends audio blob, we transcribe via Gemini and track cost
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const context = (formData.get("context") as string) || "general";
    const language = (formData.get("language") as string) || "pt-BR";
    const fieldsJson = (formData.get("fields") as string) || "[]";

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Get Gemini API key
    const config = await (prisma as any).systemConfig.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const apiKey = config?.value || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const modelConfig = await (prisma as any).systemConfig.findUnique({ where: { key: "GEMINI_MODEL" } });
    const model = modelConfig?.value || "gemini-2.0-flash";

    // Convert audio to base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioMimeType = audioFile.type || "audio/webm";

    // Estimate audio duration (rough: ~16KB per second for webm/opus)
    const estimatedDurationSec = Math.max(1, Math.round(audioFile.size / 16000));

    // Build prompt based on context
    let systemPrompt = "";
    let fields: string[] = [];
    try { fields = JSON.parse(fieldsJson); } catch { fields = []; }

    switch (context) {
      case "medical_screening":
        systemPrompt = `You are a medical transcription assistant. The patient is speaking about their medical history for a screening form. Extract and organize the information into the following fields: ${fields.join(", ")}. Return a JSON object with these field names as keys and the transcribed/extracted text as values. If the patient mentions medications, list them. If they mention allergies, list them. Keep medical terminology accurate. Language: ${language}.`;
        break;
      case "soap_note":
        systemPrompt = `You are a clinical transcription assistant. The therapist or patient is dictating a SOAP note. Extract into fields: subjective, objective, assessment, plan. Return a JSON object with these keys. Language: ${language}.`;
        break;
      case "exercise":
        systemPrompt = `You are a physiotherapy assistant. Extract exercise details from the audio: name, description, instructions, bodyRegion, difficulty, sets, reps, holdSeconds, restSeconds. Return a JSON object. Language: ${language}.`;
        break;
      default:
        systemPrompt = `Transcribe the following audio accurately. If there are form fields to fill (${fields.join(", ")}), extract the relevant information into a JSON object with those field names as keys. Otherwise return { "transcript": "..." }. Language: ${language}.`;
    }

    // Call Gemini API with audio (with retry for 429 rate limits)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: audioMimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    let geminiRes: Response | null = null;
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (geminiRes.status === 429 && attempt < maxRetries) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s
        console.warn(`[voice-transcribe] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      break;
    }

    if (!geminiRes || !geminiRes.ok) {
      const errData = await geminiRes?.json().catch(() => ({})) || {};
      console.error("[voice-transcribe] Gemini error:", errData);
      throw new Error(errData.error?.message || `Gemini API error: ${geminiRes?.status || "unknown"}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let parsedData: any = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = { transcript: rawText };
      }
    } catch {
      parsedData = { transcript: rawText };
    }

    // Calculate costs
    const durationMin = estimatedDurationSec / 60;
    const apiCostUsd = durationMin * GEMINI_COST_PER_MINUTE_USD;
    const totalCostUsd = apiCostUsd * (1 + MARGIN_PERCENT / 100);

    // Track the transcription cost (optional — skip if no clinicId or model missing)
    if (clinicId) {
      try {
        await (prisma as any).voiceTranscription.create({
          data: {
            clinicId,
            patientId: userId,
            audioDurationSec: estimatedDurationSec,
            audioSizeBytes: audioFile.size,
            language,
            transcript: rawText.substring(0, 5000),
            fieldsFilled: Object.keys(parsedData),
            context,
            apiCostUsd: Math.round(apiCostUsd * 1000000) / 1000000,
            marginPercent: MARGIN_PERCENT,
            totalCostUsd: Math.round(totalCostUsd * 1000000) / 1000000,
          },
        });
      } catch (trackErr) {
        console.warn("[voice-transcribe] Cost tracking failed (non-critical):", trackErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
      meta: {
        durationSec: estimatedDurationSec,
        language,
        context,
      },
    });
  } catch (err: any) {
    console.error("[voice-transcribe] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
