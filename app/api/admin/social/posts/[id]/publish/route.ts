import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { publishPhoto, publishCarousel } from '@/lib/instagram';

// POST /api/admin/social/posts/[id]/publish - Publish a post to Instagram
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const post = await prisma.socialPost.findUnique({
      where: { id: params.id },
      include: { account: true },
    });

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!post.account) return NextResponse.json({ error: 'No social account linked to this post' }, { status: 400 });
    if (post.status === 'PUBLISHED') return NextResponse.json({ error: 'Post already published' }, { status: 400 });

    // Mark as publishing
    await prisma.socialPost.update({
      where: { id: params.id },
      data: { status: 'PUBLISHING' },
    });

    const fullCaption = post.hashtags
      ? `${post.caption}\n\n${post.hashtags.split(',').map((h: string) => `#${h.trim().replace(/^#/, '')}`).join(' ')}`
      : post.caption;

    try {
      let result;

      if (post.postType === 'CAROUSEL' && post.mediaUrls.length > 1) {
        result = await publishCarousel({
          igAccountId: post.account.accountId,
          accessToken: post.account.accessToken,
          imageUrls: post.mediaUrls,
          caption: fullCaption,
        });
      } else {
        const imageUrl = post.mediaUrls[0];
        if (!imageUrl) throw new Error('No image URL provided');

        result = await publishPhoto({
          igAccountId: post.account.accountId,
          accessToken: post.account.accessToken,
          imageUrl,
          caption: fullCaption,
        });
      }

      await prisma.socialPost.update({
        where: { id: params.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          platformPostId: result.id,
          publishError: null,
        },
      });

      return NextResponse.json({ success: true, platformPostId: result.id, permalink: result.permalink });
    } catch (publishErr: any) {
      await prisma.socialPost.update({
        where: { id: params.id },
        data: {
          status: 'FAILED',
          publishError: publishErr.message || 'Unknown publishing error',
        },
      });

      return NextResponse.json({ error: publishErr.message || 'Publishing failed' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[SOCIAL PUBLISH] error:', error?.message);
    return NextResponse.json({ error: 'Failed to publish post' }, { status: 500 });
  }
}
