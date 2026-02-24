import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const content = await prisma.educationContent.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { assignments: true, progress: true } },
      },
    });

    if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[EDU CONTENT] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await req.json();
    const updateData: any = {};

    const fields = [
      'title', 'description', 'contentType', 'categoryId', 'body',
      'videoUrl', 'videoProvider', 'thumbnailUrl', 'imageUrls',
      'duration', 'difficulty', 'equipment', 'bodyParts', 'instructions',
      'repetitions', 'precautions', 'tags', 'isPublished', 'isFeatured',
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        if (field === 'duration') {
          updateData[field] = body[field] ? parseInt(body[field]) : null;
        } else if (field === 'body') {
          updateData[field] = body[field];
        } else {
          updateData[field] = body[field];
        }
      }
    }

    if (body.title) {
      updateData.slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const content = await prisma.educationContent.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[EDU CONTENT] PUT error:', error?.message);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    await prisma.educationContent.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[EDU CONTENT] DELETE error:', error?.message);
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
