import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUserId } from '@/lib/preview-helpers';

// Patient-facing: get assigned content + published content for their clinic
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const effectiveId = getEffectiveUserId(session, req);
    const clinicId = user.clinicId;

    // Get assigned content
    const assignments = await prisma.educationAssignment.findMany({
      where: { patientId: effectiveId },
      include: {
        content: {
          select: {
            id: true, title: true, description: true, contentType: true,
            thumbnailUrl: true, videoUrl: true, duration: true, difficulty: true,
            bodyParts: true, tags: true,
            category: { select: { id: true, name: true, color: true } },
          },
        },
        assignedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get patient's progress
    const progress = await prisma.educationProgress.findMany({
      where: { userId: effectiveId },
    });

    // Get published content for browsing
    const published = await prisma.educationContent.findMany({
      where: clinicId ? { clinicId, isPublished: true } : { isPublished: true },
      select: {
        id: true, title: true, description: true, contentType: true,
        thumbnailUrl: true, duration: true, difficulty: true, isFeatured: true,
        bodyParts: true, tags: true, viewCount: true,
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    // Get categories
    const categories = await prisma.educationCategory.findMany({
      where: clinicId ? { clinicId, isActive: true } : { isActive: true },
      include: { _count: { select: { content: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      assignments,
      progress: progress.reduce((acc: any, p: any) => { acc[p.contentId] = p; return acc; }, {}),
      published,
      categories,
    });
  } catch (error: any) {
    console.error('[EDU PATIENT] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch education data' }, { status: 500 });
  }
}
