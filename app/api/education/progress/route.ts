import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Patient updates their progress on a content item
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const body = await req.json();
    const { contentId, status, timeSpent, rating, feedback, difficulty } = body;

    if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 });

    const progress = await prisma.educationProgress.upsert({
      where: { userId_contentId: { userId: user.id, contentId } },
      update: {
        status: status || undefined,
        completedAt: status === 'completed' ? new Date() : undefined,
        timeSpent: timeSpent ? parseInt(timeSpent) : undefined,
        rating: rating ? parseInt(rating) : undefined,
        feedback: feedback || undefined,
        difficulty: difficulty || undefined,
      },
      create: {
        userId: user.id,
        contentId,
        status: status || 'in_progress',
        completedAt: status === 'completed' ? new Date() : null,
        timeSpent: timeSpent ? parseInt(timeSpent) : null,
        rating: rating ? parseInt(rating) : null,
        feedback: feedback || null,
        difficulty: difficulty || null,
      },
    });

    // Also mark assignment as completed if exists
    if (status === 'completed') {
      await prisma.educationAssignment.updateMany({
        where: { patientId: user.id, contentId, isCompleted: false },
        data: { isCompleted: true, completedAt: new Date() },
      });
    }

    // Increment view count
    await prisma.educationContent.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error('[EDU PROGRESS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
