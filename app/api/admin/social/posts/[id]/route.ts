import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { publishPhoto, publishCarousel } from '@/lib/instagram';

// GET /api/admin/social/posts/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const post = await prisma.socialPost.findUnique({
      where: { id: params.id },
      include: {
        account: true,
        campaign: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[SOCIAL POST] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PUT /api/admin/social/posts/[id] - Update post
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json();
    const { caption, hashtags, postType, mediaUrls, mediaPaths, accountId, campaignId, scheduledAt, status } = body;

    const updateData: any = {};
    if (caption !== undefined) updateData.caption = caption;
    if (hashtags !== undefined) updateData.hashtags = hashtags;
    if (postType !== undefined) updateData.postType = postType;
    if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls;
    if (mediaPaths !== undefined) updateData.mediaPaths = mediaPaths;
    if (accountId !== undefined) updateData.accountId = accountId || null;
    if (campaignId !== undefined) updateData.campaignId = campaignId || null;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (status !== undefined) updateData.status = status;

    const post = await prisma.socialPost.update({
      where: { id: params.id },
      data: updateData,
      include: {
        account: { select: { id: true, accountName: true, platform: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[SOCIAL POST] PUT error:', error?.message);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/admin/social/posts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    await prisma.socialPost.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SOCIAL POST] DELETE error:', error?.message);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
