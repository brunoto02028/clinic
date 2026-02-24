import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// PATCH — Admin approves edit request for a screening
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN', 'THERAPIST'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (action === 'approve-edit') {
    const screening = await prisma.medicalScreening.update({
      where: { id },
      data: {
        isLocked: false,
        editApprovedAt: new Date(),
        editApprovedById: (session.user as any).id,
      },
    });
    return NextResponse.json(screening);
  }

  if (action === 'lock') {
    const screening = await prisma.medicalScreening.update({
      where: { id },
      data: { isLocked: true },
    });
    return NextResponse.json(screening);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
