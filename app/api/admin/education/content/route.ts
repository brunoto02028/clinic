import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const contentType = searchParams.get('type');
    const published = searchParams.get('published');

    const where: any = clinicId ? { clinicId } : {};
    if (categoryId) where.categoryId = categoryId;
    if (contentType) where.contentType = contentType;
    if (published === 'true') where.isPublished = true;
    if (published === 'false') where.isPublished = false;

    const content = await prisma.educationContent.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { assignments: true, progress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[EDU CONTENT] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
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
    const {
      title, description, contentType, categoryId, body: contentBody,
      videoUrl, videoProvider, thumbnailUrl, imageUrls,
      duration, difficulty, equipment, bodyParts, instructions,
      repetitions, precautions, tags, isPublished, isFeatured,
    } = body;

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const content = await prisma.educationContent.create({
      data: {
        clinicId,
        createdById: user.id,
        categoryId: categoryId || null,
        title,
        slug,
        description: description || null,
        contentType: contentType || 'article',
        body: contentBody || null,
        videoUrl: videoUrl || null,
        videoProvider: videoProvider || null,
        thumbnailUrl: thumbnailUrl || null,
        imageUrls: imageUrls || [],
        imagePaths: [],
        duration: duration ? parseInt(duration) : null,
        difficulty: difficulty || null,
        equipment: equipment || null,
        bodyParts: bodyParts || [],
        instructions: instructions || null,
        repetitions: repetitions || null,
        precautions: precautions || null,
        tags: tags || [],
        isPublished: isPublished || false,
        isFeatured: isFeatured || false,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[EDU CONTENT] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 });
  }
}
