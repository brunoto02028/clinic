import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

// Pricing estimates
const MINIMAX_COST_PER_MINUTE_USD = 0.01;  // ~$0.01/min for speech-01-hd
const GEMINI_COST_PER_MINUTE_USD = 0.075;  // ~$0.075/min for Gemini Flash
const MARGIN_PERCENT = 20;

// ─── Minimax transcription + extraction ──────────────────────────────────────

async function transcribeWithMinimax(
  audioBuffer: ArrayBuffer,
  mimeType: string,
  systemPrompt: string,
  language: string
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY not configured");

  // Step 1: STT — audio → raw transcript
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append("file", blob, `audio.${mimeType.split("/")[1] || "webm"}`);
  formData.append("model", "speech-01-hd");
  formData.append("language", language.split("-")[0]); // e.g. "pt" from "pt-BR"

  const sttRes = await fetch("https://api.minimaxi.chat/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!sttRes.ok) {
    const err = await sttRes.text();
    throw new Error(`Minimax STT error (${sttRes.status}): ${err}`);
  }

  const sttData = await sttRes.json();
  const rawTranscript: string = sttData.text || "";
  if (!rawTranscript) throw new Error("Empty transcript from Minimax STT");

  // Step 2: LLM extraction — transcript → structured JSON
  const llmRes = await fetch("https://api.minimaxi.chat/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawTranscript },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!llmRes.ok) {
    const err = await llmRes.text();
    throw new Error(`Minimax LLM error (${llmRes.status}): ${err}`);
  }

  const llmData = await llmRes.json();
  return llmData.choices?.[0]?.message?.content || rawTranscript;
}

// POST — Patient sends audio blob, we transcribe via Minimax M3 (fallback: Gemini)
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

    const audioBuffer = await audioFile.arrayBuffer();
    const audioMimeType = audioFile.type || "audio/webm";

    // Estimate audio duration (rough: ~16KB per second for webm/opus)
    const estimatedDurationSec = Math.max(1, Math.round(audioFile.size / 16000));

    // Build prompt based on context
    let systemPrompt = "";
    let fields: string[] = [];
    try { fields = JSON.parse(fieldsJson); } catch { fields = []; }

    switch (context) {
      case "medical_screening":
        systemPrompt = `You are a medical transcription assistant. The patient is speaking about their medical history for a screening form.
Extract and organize the information into the following fields: ${fields.join(", ")}.
Return a JSON object with these field names as keys.

IMPORTANT FIELD RULES:
- painLevel: must be a NUMBER from 0 to 10 (e.g. "dor nivel 7" → painLevel: "7")
- painTypes: array of keys from: throbbing, sharp, stabbing, burning, dull, pressure, tingling, cramping, radiating (e.g. ["sharp","burning"])
- painPatterns: array of keys from: constant, intermittent, comes_goes, worsens_activity, worsens_rest, morning, night, weather (e.g. ["constant","morning"])
- painImpact: array of keys from: sleep, work, mobility, daily_activities, mood, exercise, social, concentration (e.g. ["sleep","work"])
- painLocation, painDuration, painNotes: free text strings
- Fields ending in "Details" (e.g. unexplainedWeightLossDetails, nightPainDetails, traumaHistoryDetails, etc.) are for extra details about red flag symptoms the patient mentions. Extract relevant details into these fields.
- All other fields: plain text strings.

If the patient mentions medications, list them. If they mention allergies, list them. Keep medical terminology accurate. Only include fields that the patient actually mentioned. Language: ${language}.`;
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

    // ── Try Minimax M3 first (STT + LLM extraction) ─────────────────────────
    let rawText = "";
    let usedProvider = "gemini";
    let costPerMin = GEMINI_COST_PER_MINUTE_USD;

    try {
      rawText = await transcribeWithMinimax(audioBuffer, audioMimeType, systemPrompt, language);
      usedProvider = "minimax";
      costPerMin = MINIMAX_COST_PER_MINUTE_USD;
      console.log("[voice-transcribe] Minimax M3 transcription OK");
    } catch (minimaxErr: any) {
      console.warn("[voice-transcribe] Minimax failed, falling back to Gemini:", minimaxErr.message);

      // ── Fallback: Gemini multimodal ─────────────────────────────────────────
      const geminiConfig = await (prisma as any).systemConfig.findUnique({ where: { key: "GEMINI_API_KEY" } });
      const geminiApiKey = geminiConfig?.value || process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error("No AI provider available for transcription");

      const modelConfig = await (prisma as any).systemConfig.findUnique({ where: { key: "GEMINI_MODEL" } });
      const geminiModel = modelConfig?.value || "gemini-2.0-flash";
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

      let geminiRes: Response | null = null;
      for (let attempt = 0; attempt <= 3; attempt++) {
        geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }, { inline_data: { mime_type: audioMimeType, data: audioBase64 } }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
        });
        if (geminiRes.status === 429 && attempt < 3) {
          await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 8000)));
          continue;
        }
        break;
      }

      if (!geminiRes || !geminiRes.ok) {
        const errData = await geminiRes?.json().catch(() => ({})) || {};
        throw new Error(errData.error?.message || `Gemini API error: ${geminiRes?.status}`);
      }
      const geminiData = await geminiRes.json();
      rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

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
    const apiCostUsd = durationMin * costPerMin;
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
