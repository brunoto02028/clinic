import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { resolveClinicId } from '@/lib/resolve-clinic-id';

export const dynamic = 'force-dynamic';

// GET /api/admin/social/posts - List posts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const campaignId = searchParams.get('campaignId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const clinicId = await resolveClinicId(session);

    const where: any = {};
    if (clinicId) where.clinicId = clinicId;
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          account: { select: { id: true, accountName: true, platform: true, profilePicUrl: true } },
          campaign: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, limit });
  } catch (error: any) {
    console.error('[SOCIAL POSTS] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/admin/social/posts - Create a post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const user = session.user as any;
    const clinicId = await resolveClinicId(session);
    if (!clinicId) {
      return NextResponse.json({ error: 'No clinic context' }, { status: 400 });
    }

    const body = await req.json();
    const {
      caption,
      hashtags,
      postType = 'IMAGE',
      mediaUrls = [],
      mediaPaths = [],
      accountId,
      campaignId,
      scheduledAt,
      status,
      aiGenerated = false,
      aiPrompt,
      musicUrl,
      musicTitle,
    } = body;

    if (!caption) {
      return NextResponse.json({ error: 'Caption is required' }, { status: 400 });
    }

    // Auto-resolve the clinic's connected Instagram account when the caller
    // doesn't pass one — without this, posts saved without an explicit
    // accountId (e.g. the Content Calendar generator) could never be found
    // by the publish cron (which requires accountId to be set) or by the
    // manual publish button (which requires post.account to exist).
    let resolvedAccountId = accountId || null;
    if (!resolvedAccountId) {
      const account = await prisma.socialAccount.findFirst({
        where: { clinicId, platform: 'INSTAGRAM', isActive: true },
        select: { id: true },
      });
      resolvedAccountId = account?.id || null;
    }

    // A post with no media can never actually publish (Instagram requires an
    // image/video). Only auto-promote to SCHEDULED when the caller didn't
    // pin a status AND there's media to publish — otherwise force DRAFT so
    // it never gets silently picked up (and silently failed) by the cron.
    const hasMedia = mediaUrls.length > 0;
    const resolvedStatus = status || (scheduledAt && hasMedia ? 'SCHEDULED' : 'DRAFT');

    const post = await prisma.socialPost.create({
      data: {
        clinicId,
        caption,
        hashtags: hashtags || null,
        postType,
        mediaUrls,
        mediaPaths,
        accountId: resolvedAccountId,
        campaignId: campaignId || null,
        createdById: user.id,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: resolvedStatus,
        aiGenerated,
        aiPrompt: aiPrompt || null,
        musicUrl: musicUrl || null,
        musicTitle: musicTitle || null,
      },
      include: {
        account: { select: { id: true, accountName: true, platform: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('[SOCIAL POSTS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
