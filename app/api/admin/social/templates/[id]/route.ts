import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { staffTenantRecord } from '@/lib/tenant-record-access';

export const dynamic = 'force-dynamic';

// DELETE /api/admin/social/templates/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const tenantAccess = await staffTenantRecord(req, 'socialTemplate', params.id, 'Template not found');
    if (tenantAccess.response) return tenantAccess.response;

    await prisma.socialTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TEMPLATE DELETE] error:', error?.message);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
