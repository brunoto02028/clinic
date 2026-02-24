export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { callAI, callAIChat } from '@/lib/ai-provider';
import { getConfigValue } from '@/lib/system-config';
import { publishPhoto, publishCarousel } from '@/lib/instagram';

// ─── POST: publish or schedule an article to Instagram ───
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, articleId, caption, imageUrls, scheduledAt } = body;

    // ── action: generate_caption ── (no Instagram credentials needed)
    if (action === 'generate_caption') {
      const article = await (prisma as any).article.findUnique({
        where: { id: articleId },
        select: { title: true, excerpt: true, content: true, slug: true },
      });
      if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      const articleUrl = `${BASE}/articles/${article.slug}`;

      // Strip HTML from content for AI context
      const plainContent = (article.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);

      const lang = body.language || 'en-GB';
      const langInstruction = lang === 'pt-BR'
        ? 'Write the caption in Brazilian Portuguese.'
        : 'Write the caption in English.';

      const prompt = `You are a social media expert for Bruno Physical Rehabilitation, a physiotherapy clinic.
Write an engaging Instagram caption based on this full article:

TITLE: ${article.title}
EXCERPT: ${article.excerpt || ''}
FULL CONTENT: ${plainContent}
ARTICLE URL: ${articleUrl}

${langInstruction}

Rules:
- Max 2200 characters total
- Start with a powerful hook (question or bold statement that grabs attention)
- 2-3 short, punchy paragraphs summarising the key insights
- Include a clear call to action: "Read the full article 👇 ${articleUrl}"
- End with 15-20 relevant hashtags on a new line
- Tone: professional but warm, approachable and motivating
- Do NOT use markdown formatting, just plain text with line breaks
- Include relevant emojis naturally

Write ONLY the caption text, nothing else.`;

      try {
        const generatedCaption = await callAI(prompt, { temperature: 0.75, maxTokens: 1200 });
        return NextResponse.json({ caption: generatedCaption.trim() });
      } catch {
        const fallback = `${article.title}\n\n${article.excerpt || ''}\n\n🔗 ${articleUrl}\n\n#physiotherapy #rehabilitation #health`;
        return NextResponse.json({ caption: fallback });
      }
    }

    // ── action: ai_chat ── (interactive AI chat about the caption, no Instagram credentials needed)
    if (action === 'ai_chat') {
      const { messages, articleId: chatArticleId } = body;

      let articleContext = '';
      if (chatArticleId) {
        const article = await (prisma as any).article.findUnique({
          where: { id: chatArticleId },
          select: { title: true, excerpt: true, content: true, slug: true },
        });
        if (article) {
          const plainContent = (article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
          articleContext = `\n\nARTICLE CONTEXT:\nTitle: ${article.title}\nExcerpt: ${article.excerpt || ''}\nContent: ${plainContent}`;
        }
      }

      const systemPrompt = `You are an expert Instagram social media assistant for Bruno Physical Rehabilitation, a physiotherapy clinic. You help create and refine Instagram captions, suggest improvements, answer questions about tone/hashtags/strategy, and help make posts more engaging.${articleContext}\n\nBe concise, helpful and professional. If the user asks you to rewrite or improve the caption, do so directly.`;

      try {
        const reply = await callAIChat(messages || [], {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 800,
        });
        return NextResponse.json({ reply: reply.trim() });
      } catch {
        return NextResponse.json({ reply: 'AI could not generate a response. Please try again.' });
      }
    }

    // ── Instagram credentials required for publish/schedule ──
    const accessToken = await getConfigValue('INSTAGRAM_ACCESS_TOKEN');
    const igAccountId = await getConfigValue('INSTAGRAM_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !igAccountId) {
      return NextResponse.json({
        error: 'Instagram not configured. Please add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in Admin → API & AI Settings.',
      }, { status: 400 });
    }

    // ── action: publish ──
    if (action === 'publish') {
      if (!caption) return NextResponse.json({ error: 'Caption is required' }, { status: 400 });
      if (!imageUrls || imageUrls.length === 0) return NextResponse.json({ error: 'At least one image URL is required' }, { status: 400 });

      // Make image URLs absolute
      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      const absoluteUrls = imageUrls.map((u: string) => u.startsWith('http') ? u : `${BASE}${u}`);

      let result;
      if (absoluteUrls.length === 1) {
        result = await publishPhoto({ igAccountId, accessToken, imageUrl: absoluteUrls[0], caption });
      } else {
        result = await publishCarousel({ igAccountId, accessToken, imageUrls: absoluteUrls, caption });
      }

      // Save post record
      await (prisma as any).instagramPost.create({
        data: {
          articleId: articleId || null,
          igMediaId: result.id,
          permalink: result.permalink || null,
          caption,
          imageUrls: absoluteUrls,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          createdById: (session.user as any).id,
        },
      }).catch(() => {}); // Ignore if table doesn't exist yet

      return NextResponse.json({ success: true, mediaId: result.id, permalink: result.permalink });
    }

    // ── action: schedule ──
    if (action === 'schedule') {
      if (!caption || !scheduledAt) return NextResponse.json({ error: 'Caption and scheduledAt are required' }, { status: 400 });

      await (prisma as any).instagramPost.create({
        data: {
          articleId: articleId || null,
          igMediaId: null,
          permalink: null,
          caption,
          imageUrls: imageUrls || [],
          status: 'SCHEDULED',
          scheduledAt: new Date(scheduledAt),
          createdById: (session.user as any).id,
        },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: `Post scheduled for ${new Date(scheduledAt).toLocaleString()}` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[instagram-articles] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET: list published/scheduled posts for an article ───
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');

    const posts = await (prisma as any).instagramPost.findMany({
      where: articleId ? { articleId } : {},
      orderBy: { createdAt: 'desc' },
      take: 20,
    }).catch(() => []);

    return NextResponse.json({ posts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
