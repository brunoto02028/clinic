import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { claudeGenerate } from "@/lib/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

const SYSTEM_PROMPT = `You are a clinical translator specialised in physical rehabilitation terminology.
Translate exercise content from English to Brazilian Portuguese (português do Brasil).

RULES:
- Use proper Brazilian Portuguese rehabilitation terminology (e.g. "séries" for sets, "repetições" for reps, "isométrico", "amplitude de movimento").
- NEVER use the words "fisioterapia" or "fisioterapeuta" — use "reabilitação física" and "profissional de reabilitação".
- Keep the same tone: clear, professional, patient-friendly.
- Preserve numbers, units and formatting (line breaks, numbered steps).
- Respond ONLY with valid JSON, no markdown fences.`;

type TranslatePayload = { name: string; description: string | null; instructions: string | null };

async function translateBatch(items: Array<{ id: string } & TranslatePayload>) {
  const input = items.map((e, i) => ({
    i,
    name: e.name,
    description: e.description || "",
    instructions: e.instructions || "",
  }));

  const raw = await claudeGenerate(
    [{
      role: "user",
      content: `Translate the following ${input.length} exercise(s) to European Portuguese. Return a JSON array in the same order, each element: {"i": <index>, "namePt": "...", "descriptionPt": "...", "instructionsPt": "..."} (empty string when the source field is empty).\n\n${JSON.stringify(input)}`,
    }],
    { systemPrompt: SYSTEM_PROMPT, maxTokens: 8000, temperature: 0.2 }
  );

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const arr = JSON.parse(cleaned);
  if (!Array.isArray(arr)) throw new Error("AI returned invalid format");

  const results: Array<{ id: string; namePt: string; descriptionPt: string | null; instructionsPt: string | null }> = [];
  for (const t of arr) {
    const src = items[t.i];
    if (!src || !t.namePt) continue;
    results.push({
      id: src.id,
      namePt: String(t.namePt),
      descriptionPt: t.descriptionPt ? String(t.descriptionPt) : null,
      instructionsPt: t.instructionsPt ? String(t.instructionsPt) : null,
    });
  }
  return results;
}

// ─── POST — Translate exercises EN → PT ───
// body: { exerciseId }  → translate a single exercise
// body: { all: true }   → translate all exercises missing a PT name (batched)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exerciseId, all } = await req.json();
    const clinicId = (session.user as any).clinicId;

    if (exerciseId) {
      const ex = await prisma.exercise.findUnique({
        where: { id: exerciseId },
        select: { id: true, name: true, description: true, instructions: true },
      });
      if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

      const [translated] = await translateBatch([ex]);
      if (!translated) return NextResponse.json({ error: "Translation failed" }, { status: 500 });

      const updated = await (prisma as any).exercise.update({
        where: { id: ex.id },
        data: { namePt: translated.namePt, descriptionPt: translated.descriptionPt, instructionsPt: translated.instructionsPt },
      });
      return NextResponse.json({ success: true, exercise: updated });
    }

    if (all) {
      const where: any = { isActive: true, namePt: null };
      if (clinicId) where.clinicId = clinicId;

      const pending = await (prisma as any).exercise.findMany({
        where,
        select: { id: true, name: true, description: true, instructions: true },
        orderBy: { name: "asc" },
        take: 100, // safety cap per request
      });

      if (pending.length === 0) {
        return NextResponse.json({ success: true, translated: 0, remaining: 0, message: "All exercises already translated" });
      }

      let translatedCount = 0;
      const failures: string[] = [];
      const BATCH = 8;
      for (let i = 0; i < pending.length; i += BATCH) {
        const chunk = pending.slice(i, i + BATCH);
        try {
          const results = await translateBatch(chunk);
          for (const r of results) {
            await (prisma as any).exercise.update({
              where: { id: r.id },
              data: { namePt: r.namePt, descriptionPt: r.descriptionPt, instructionsPt: r.instructionsPt },
            });
            translatedCount++;
          }
        } catch (err: any) {
          console.error("[exercises/translate] batch failed:", err.message);
          failures.push(...chunk.map((c: any) => c.name));
        }
      }

      const remaining = await (prisma as any).exercise.count({ where });
      return NextResponse.json({ success: true, translated: translatedCount, remaining, failures });
    }

    return NextResponse.json({ error: "Provide exerciseId or all:true" }, { status: 400 });
  } catch (err: any) {
    console.error("[exercises/translate] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
