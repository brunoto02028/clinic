import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { resolveClinicId } from '@/lib/resolve-clinic-id';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/social/accounts/[id] - Disconnect a connected account
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const clinicId = await resolveClinicId(session);

    const account = await prisma.socialAccount.findUnique({ where: { id: params.id } });
    if (!account || (clinicId && account.clinicId !== clinicId)) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await prisma.socialAccount.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SOCIAL ACCOUNTS] DELETE error:', error?.message);
    return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
  }
}
