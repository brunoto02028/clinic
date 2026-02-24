import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateCaption, generateHashtags, improveCaption, generateCampaign } from '@/lib/gemini';

// POST /api/admin/social/generate - AI content generation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'caption': {
        const result = await generateCaption({
          topic: params.topic,
          tone: params.tone,
          clinicName: params.clinicName,
          services: params.services,
          targetAudience: params.targetAudience,
          language: params.language,
        });
        return NextResponse.json(result);
      }

      case 'hashtags': {
        const hashtags = await generateHashtags({
          topic: params.topic,
          count: params.count,
          niche: params.niche,
        });
        return NextResponse.json({ hashtags });
      }

      case 'improve': {
        const improved = await improveCaption({
          caption: params.caption,
          instruction: params.instruction,
        });
        return NextResponse.json({ caption: improved });
      }

      case 'campaign': {
        const campaign = await generateCampaign({
          goal: params.goal,
          duration: params.duration,
          clinicName: params.clinicName,
          services: params.services,
          language: params.language,
        });
        return NextResponse.json(campaign);
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: caption, hashtags, improve, campaign' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[AI GENERATE] error:', error?.message);

    if (error?.message?.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'Gemini API key not configured. Add GEMINI_API_KEY to your environment variables.' }, { status: 500 });
    }

    return NextResponse.json({ error: error?.message || 'AI generation failed' }, { status: 500 });
  }
}
