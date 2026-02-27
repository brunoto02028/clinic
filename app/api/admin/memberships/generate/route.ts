import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getConfigValue } from "@/lib/system-config";
import { ALL_FEATURE_KEYS, MODULE_REGISTRY, PERMISSION_REGISTRY } from "@/lib/module-registry";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Get Gemini API key (same pattern as body assessment AI)
  const geminiKey = await getConfigValue("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "AI not configured. Add GEMINI_API_KEY in AI Settings." }, { status: 500 });
  }
  const geminiModel = (await getConfigValue("GEMINI_MODEL")) || "gemini-2.0-flash";

  // Build available modules/permissions list for the AI
  const modulesList = MODULE_REGISTRY.map(m => `${m.key}: ${m.label} — ${m.description}${m.alwaysVisible ? " (CORE - always included)" : ""}`).join("\n");
  const permsList = PERMISSION_REGISTRY.map(p => `${p.key}: ${p.label} — ${p.description}`).join("\n");

  const systemPrompt = `You are a membership plan generator for a physiotherapy/rehabilitation clinic called "Bruno Physical Rehabilitation" (BPR).
Given a user description, generate a membership plan JSON object.

Available module keys:
${modulesList}

Available permission keys:
${permsList}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "name": "Plan Name",
  "description": "Brief plan description",
  "price": 9.90,
  "interval": "MONTHLY",
  "isFree": false,
  "features": ["mod_key1", "mod_key2", "perm_key1"],
  "patientScope": "all"
}

Rules:
- "interval" must be one of: "WEEKLY", "MONTHLY", "YEARLY"
- "patientScope" must be one of: "all", "none"
- "features" must only contain valid keys from the lists above
- Core modules (mod_dashboard, mod_profile, mod_plans, mod_terms) are always included automatically, but include them in features anyway
- If the user says "free", set isFree=true and price=0
- Generate a professional, descriptive name and description
- Select features that make sense for the described plan tier
- Price should be in GBP (£)`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }] },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini error:", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const plan = JSON.parse(jsonStr);

    // Validate features — only allow known keys
    const validKeys = new Set(ALL_FEATURE_KEYS);
    plan.features = (plan.features || []).filter((k: string) => validKeys.has(k));

    // Clamp values
    plan.price = Math.max(0, Number(plan.price) || 0);
    if (!["WEEKLY", "MONTHLY", "YEARLY"].includes(plan.interval)) plan.interval = "MONTHLY";
    if (!["all", "none", "specific"].includes(plan.patientScope)) plan.patientScope = "all";
    plan.isFree = plan.isFree === true || plan.price === 0;

    return NextResponse.json(plan);
  } catch (e: any) {
    console.error("AI membership generation error:", e);
    return NextResponse.json({ error: "Failed to parse AI response. Try a more specific prompt." }, { status: 500 });
  }
}
