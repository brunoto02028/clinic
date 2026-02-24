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
  const { topic, language, instruction } = body;

  if (!topic) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }

  const lang = language || 'British English';

  const prompt = `You are a professional health content writer for "Bruno Physical Rehabilitation", a physiotherapy clinic in London and Ipswich, UK specialising in sports injury recovery, electrotherapy, biomechanical assessments, custom insoles, exercise therapy, and rehabilitation.

Write a complete blog article about: "${topic}"
${instruction ? `Additional instructions: ${instruction}` : ''}

Requirements:
- Write in ${lang}
- Professional, educational, and patient-friendly tone
- Evidence-based information where applicable
- 600-1000 words for the content
- Include practical tips patients can use
- Do NOT use markdown formatting in the content

Respond in this exact JSON format (no markdown wrapping, no code blocks):
{
  "title": "Article Title Here",
  "excerpt": "A compelling 1-2 sentence summary for previews",
  "content": "Full article content with paragraphs separated by double newlines",
  "suggestedImageSearch": "A search query to find a relevant stock photo"
}`;

  try {
    const raw = await callAI(prompt, { temperature: 0.7, maxTokens: 4096 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse article from AI response');
    const article = JSON.parse(jsonMatch[0]);
    return NextResponse.json(article);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
