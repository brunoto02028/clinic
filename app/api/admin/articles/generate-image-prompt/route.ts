import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { callAI } from '@/lib/ai-provider';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, excerpt, content } = await req.json();

  if (!title && !excerpt && !content) {
    return NextResponse.json({ error: 'At least one of title, excerpt, or content is required' }, { status: 400 });
  }

  // Strip HTML tags from content for the AI to read
  const plainContent = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  // Limit content to ~2000 chars to save tokens
  const trimmedContent = plainContent.length > 2000 ? plainContent.slice(0, 2000) + '...' : plainContent;

  const systemInstruction = `You are an expert at creating image generation prompts for blog article cover images.

Given an article's title, excerpt, and body content, create a single detailed image generation prompt that will produce a professional, visually appealing cover image.

RULES:
- Output ONLY the prompt text, nothing else — no explanations, no labels, no quotes
- The prompt should describe a photorealistic or high-quality illustration scene
- Focus on the MAIN THEME and MOOD of the article
- Include specific visual details: lighting, composition, colors, style
- The image should work as a 16:9 blog header/cover
- DO NOT include any text, letters, words, or typography in the image description
- Keep the prompt under 200 words
- Style: professional, clean, modern healthcare/physiotherapy aesthetic
- If the article is about a body part or condition, feature it visually
- Use warm, inviting tones appropriate for a rehabilitation clinic`;

  try {
    const userPrompt = `Article Title: ${title || 'Untitled'}\n\nExcerpt: ${excerpt || 'No excerpt'}\n\nContent:\n${trimmedContent || 'No content yet'}`;

    const prompt = await callAI(userPrompt, {
      systemPrompt: systemInstruction,
      temperature: 0.8,
      maxTokens: 512,
    });

    if (!prompt) {
      throw new Error('AI returned empty prompt');
    }

    return NextResponse.json({ prompt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
