export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owSyncUser } from '@/lib/open-wearables';
import { getEffectiveUser } from '@/lib/get-effective-user';

export async function POST(request: NextRequest) {
  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await request.json();
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase(), status: 'CONNECTED' },
  });

  if (!connection?.owUserId) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await owSyncUser(provider.toLowerCase(), connection.owUserId);

  return NextResponse.json({ ok: true, message: 'Sync initiated' });
}
