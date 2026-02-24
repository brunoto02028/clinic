import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET /api/admin/social/templates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;

    const templates = await prisma.socialTemplate.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('[TEMPLATES] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/admin/social/templates
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const user = session.user as any;
    const clinicId = user.clinicId;
    if (!clinicId) return NextResponse.json({ error: 'No clinic context' }, { status: 400 });

    const body = await req.json();
    const { name, description, category, captionTemplate, hashtagSets } = body;

    if (!name || !captionTemplate) {
      return NextResponse.json({ error: 'Name and caption template are required' }, { status: 400 });
    }

    const template = await prisma.socialTemplate.create({
      data: {
        clinicId,
        name,
        description: description || null,
        category: category || null,
        captionTemplate,
        hashtagSets: hashtagSets || null,
      },
    });

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error('[TEMPLATES] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
