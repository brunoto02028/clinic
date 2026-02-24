import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;

    const categories = await prisma.educationCategory.findMany({
      where: clinicId ? { clinicId } : {},
      include: { _count: { select: { content: true } } },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('[EDU CATEGORIES] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const body = await req.json();
    const { name, description, icon, color } = body;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const maxOrder = await prisma.educationCategory.aggregate({
      where: { clinicId },
      _max: { sortOrder: true },
    });

    const category = await prisma.educationCategory.create({
      data: {
        clinicId,
        name,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('[EDU CATEGORIES] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
