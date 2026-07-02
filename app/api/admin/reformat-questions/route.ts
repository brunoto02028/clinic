import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questions, lang = "pt" } = await req.json();
  if (!questions?.length) return NextResponse.json({ error: "No questions" }, { status: 400 });

  const rawList = (questions as string[])
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const isPt = lang === "pt";

  const prompt = isPt
    ? `Você é um fisioterapeuta brasileiro a preparar perguntas para enviar DIRECTAMENTE ao seu paciente via portal digital.

Regras OBRIGATÓRIAS:
- Escreva em Português do Brasil (pt-BR)
- Use SEMPRE a 2ª pessoa com "você" — NUNCA use "o paciente", "ele", "ela" ou 3ª pessoa
- Tom caloroso, directo e profissional — como se estivesse a falar pessoalmente com o paciente
- Cada pergunta deve ser clara, simples e respeitosa
- Mantenha o mesmo conteúdo clínico — apenas corrija a forma e a pessoa gramatical
- Devolva APENAS as perguntas reformuladas, uma por linha numerada, sem texto extra

Perguntas originais a reformular:
${rawList}

Devolva no formato:
1. [pergunta reformulada]
2. [pergunta reformulada]
...`
    : `You are a physiotherapist preparing questions to send DIRECTLY to your patient via a digital portal.

MANDATORY rules:
- Write in clear, warm English
- Always address the patient directly using "you" — NEVER use "the patient", "he", "she" or third person
- Tone: warm, professional, direct — as if speaking to them in person
- Keep the same clinical content — only fix the grammatical person and tone
- Return ONLY the reformulated questions, one per numbered line, no extra text

Original questions to reformulate:
${rawList}

Return in format:
1. [reformulated question]
2. [reformulated question]
...`;

  try {
    const result = await callAI(prompt, { temperature: 0.3, maxTokens: 1024 });

    const reformulated = result
      .split("\n")
      .filter(l => /^\d+[\.\)]/.test(l.trim()))
      .map(l => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean);

    if (reformulated.length === 0) {
      return NextResponse.json({ questions: questions });
    }

    return NextResponse.json({ questions: reformulated });
  } catch (e: any) {
    console.error("[reformat-questions]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
