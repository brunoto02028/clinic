import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { publishSocialPost } from '@/lib/social-publish';

// POST /api/admin/social/posts/[id]/publish - Publish a post to Instagram (+ Facebook if connected)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const result = await publishSocialPost(params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Publishing failed' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      platformPostId: result.platformPostId,
      permalink: result.permalink,
      facebookPostId: result.facebookPostId,
      facebookError: result.facebookError,
    });
  } catch (error: any) {
    console.error('[SOCIAL PUBLISH] error:', error?.message);
    return NextResponse.json({ error: 'Failed to publish post' }, { status: 500 });
  }
}
