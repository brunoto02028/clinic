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
    const patientId = searchParams.get('patientId');

    const where: any = clinicId ? { clinicId } : {};
    if (patientId) where.patientId = patientId;

    const assignments = await prisma.educationAssignment.findMany({
      where,
      include: {
        content: { select: { id: true, title: true, contentType: true, thumbnailUrl: true, duration: true } },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('[EDU ASSIGNMENTS] GET error:', error?.message);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
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
    const { contentId, patientId, note, dueDate, frequency, isRequired } = body;

    if (!contentId || !patientId) {
      return NextResponse.json({ error: 'Content and patient are required' }, { status: 400 });
    }

    const assignment = await prisma.educationAssignment.create({
      data: {
        clinicId,
        contentId,
        patientId,
        assignedById: user.id,
        note: note || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        frequency: frequency || null,
        isRequired: isRequired || false,
      },
      include: {
        content: { select: { id: true, title: true, contentType: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ assignment });
  } catch (error: any) {
    console.error('[EDU ASSIGNMENTS] POST error:', error?.message);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
