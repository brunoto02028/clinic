import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { callAI } from '@/lib/ai-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { fieldName, fieldLabel, currentValue, context, language } = body;

  if (!fieldName || !fieldLabel) {
    return NextResponse.json({ error: 'fieldName and fieldLabel required' }, { status: 400 });
  }

  const lang = language || 'British English';

  // Build context-aware prompt
  const contextInfo = context
    ? `\nContext about this section: ${context}`
    : '';

  const currentInfo = currentValue
    ? `\nCurrent value (improve or replace): "${currentValue}"`
    : '';

  const prompt = `You are a professional copywriter for "Bruno Physical Rehabilitation", a physiotherapy clinic based in London and Ipswich, UK. The clinic specialises in sports injury recovery, electrotherapy, biomechanical assessments, custom insoles, exercise therapy, and rehabilitation.

Write content for the website field: "${fieldLabel}"
${contextInfo}
${currentInfo}

Requirements:
- Write in ${lang}
- Professional, warm, and confidence-inspiring tone
- Focus on patient outcomes and clinical excellence
- Highlight technology, precision, and personalised care
- Keep it concise and impactful (suitable for a website)
- Do NOT use markdown formatting, just plain text
- If it's a title, keep it short (3-8 words)
- If it's a subtitle, keep it to 1-2 sentences
- If it's a description/text, write 2-4 sentences

Respond with ONLY the text content, nothing else.`;

  try {
    const text = await callAI(prompt, { temperature: 0.7, maxTokens: 1024 });
    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
