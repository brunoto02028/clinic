export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owDisconnect } from '@/lib/open-wearables';
import { getEffectiveUser } from '@/lib/get-effective-user';

export async function POST(request: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase() },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (connection.owUserId) {
    try {
      await owDisconnect(connection.owUserId, provider.toLowerCase());
    } catch {}
  }

  await (prisma as any).wearableConnection.update({
    where: { id: connection.id },
    data: { status: 'DISCONNECTED' },
  });

  return NextResponse.json({ ok: true });
}
