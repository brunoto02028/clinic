import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET /api/admin/social/campaigns
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;

    const campaigns = await prisma.socialCampaign.findMany({
      where: clinicId ? { clinicId } : {},
      include: {
        _count: { select: { posts: true } },
        posts: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = campaigns.map((c: any) => ({
      ...c,
      postsCount: c._count.posts,
      publishedCount: c.posts.filter((p: any) => p.status === 'PUBLISHED').length,
      scheduledCount: c.posts.filter((p: any) => p.status === 'SCHEDULED').length,
      draftCount: c.posts.filter((p: any) => p.status === 'DRAFT').length,
      posts: undefined,
      _count: undefined,
    }));

    return NextResponse.json({ campaigns: enriched });
  } catch (error: any) {
    console.error('[CAMPAIGNS] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST /api/admin/social/campaigns
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const body = await req.json();
    const { name, description, goal, startDate, endDate } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const campaign = await prisma.socialCampaign.create({
      data: {
        clinicId,
        name,
        description: description || null,
        goal: goal || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error: any) {
    console.error('[CAMPAIGNS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
