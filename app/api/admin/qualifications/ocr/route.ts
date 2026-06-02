import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

// POST — Upload certificate image and extract data via Gemini Vision
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const geminiKey = await getConfigValue("GEMINI_API_KEY");
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    // Call Gemini Vision for OCR
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

    const prompt = `You are an expert at reading certificates, diplomas, and qualification documents.

Analyse this certificate/diploma image and extract ALL information you can find.

Return a JSON object with these fields (use null if not found):
{
  "title": "The course/qualification title (e.g. 'Dry Needling Foundation Course', 'BSc Physiotherapy')",
  "provider": "The organisation/institution that issued this (e.g. 'Core Elements Training', 'University of...')",
  "providerUrl": "Website URL if visible on the certificate",
  "certificateNumber": "Certificate/reference number if shown",
  "dateAchieved": "Date in YYYY-MM-DD format (e.g. '2025-09-12')",
  "cpdHours": number of CPD hours if mentioned (just the number, e.g. 16),
  "level": "Level if mentioned (e.g. 'Foundation', 'Advanced', 'Level 7', 'MSc')",
  "category": "Best matching category from: degree, electrotherapy, dry_needling, manual_therapy, shockwave_therapy, laser_therapy, sports_rehabilitation, biomechanics, injection_therapy, pain_management, clinical_pilates, business, general_cpd",
  "accreditation": "Accreditation bodies mentioned (e.g. 'STO + FHT accredited', 'HCPC approved')",
  "tutor": "Tutor/instructor name if shown",
  "location": "Address or location if shown",
  "recipientName": "Name of the person on the certificate",
  "description": "Brief description of what the qualification covers based on the certificate content"
}

Return ONLY the JSON object, no markdown, no explanation.`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[qualifications/ocr] Gemini error:", errText);
      return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
    }

    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let extracted;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        extracted = JSON.parse(jsonMatch[0]);
      } catch {
        const cleaned = responseText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const retryMatch = cleaned.match(/\{[\s\S]*\}/);
        if (retryMatch) extracted = JSON.parse(retryMatch[0]);
      }
    }

    if (!extracted) {
      return NextResponse.json({ error: "Could not extract data from image. Please try a clearer photo." }, { status: 422 });
    }

    return NextResponse.json({ extracted, imageBase64: `data:${mimeType};base64,${base64}` });
  } catch (error: any) {
    console.error("[qualifications/ocr] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
