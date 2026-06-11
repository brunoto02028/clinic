import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { callAI } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

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

  const prompt = `You are a specialist physiotherapy and rehabilitation content writer for "BPR — Bruno Physical Rehabilitation", a clinic based in Ipswich, Suffolk, UK.

Clinic specialisms: sports injury rehabilitation, electrotherapy & ultrasound, dry needling, myofascial dry cupping, biomechanical assessments, custom orthotics, exercise therapy, postural rehabilitation.

Write a complete, evidence-based blog article about: "${topic}"
${instruction ? `Additional instructions: ${instruction}` : ''}

Requirements:
- Write in ${lang}
- Tone: warm, first-person, humanized — write as if Bruno is speaking directly to a patient he cares about
- Length: 700-1200 words
- OPENING: Start with a relatable scenario or question, NOT a definition
- Use "I" and "you" naturally: "In my clinic I often see...", "You've probably felt this..."
- Mix short and long sentences for rhythm. Vary paragraph length.
- Use rhetorical questions to engage the reader
- Explain all medical terms immediately in plain language
- Mention real clinical patterns: "A patient I treated recently..." (no identifying details)
- AVOID these AI phrases: "It is important to note", "Furthermore", "Moreover", "In conclusion", "Delve into", "It is crucial to understand"
- Use active voice throughout
- End with a personal, encouraging CTA: "Book a consultation at BPR — Bruno Physical Rehabilitation..."
- BRAND INTEGRATION (mandatory throughout):
  * Within the first 2 paragraphs, anchor BPR naturally: "At BPR — Bruno Physical Rehabilitation — this is one of the most common conditions we treat."
  * Mention 2-4 relevant BPR services by name (electrotherapy, dry needling, biomechanical assessment, custom orthotics, exercise therapy, myofascial cupping) woven naturally into the text
  * At least once highlight BPR's differentiation: "What sets BPR apart is..."
  * Close with: <p><strong>Ready to take the first step?</strong> Book a consultation at <strong>BPR — Bruno Physical Rehabilitation</strong> and let's create a plan that gets you back to doing what you love. <a href="/dashboard/appointments/book">Book your appointment here</a>.</p>
- Evidence-based: reference relevant research, anatomy, or clinical guidelines
- ALWAYS end with a References section citing 3-5 real academic sources
- The "content" field MUST be valid HTML (not markdown, not plain text)
- Use <h2><strong>Title</strong></h2> for sections, <p> for paragraphs, <ul><li> for lists, <ol><li> for steps
- End content with: <h2><strong>References</strong></h2><ol><li><em>Author et al. (Year). Title. Journal, vol(issue), pages.</em></li>...</ol>

Respond in this exact JSON format (no markdown wrapping, no code blocks):
{
  "title": "Article Title Here",
  "excerpt": "A compelling 1-2 sentence summary for previews",
  "content": "<p>HTML content here</p>",
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
