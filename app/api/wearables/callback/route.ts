export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.clinic';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider') || '';
  const userId = request.nextUrl.searchParams.get('userId') || '';
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/dashboard/biohacking?connected=0&error=${error}`);
  }

  await (prisma as any).wearableConnection.upsert({
    where: { userId_provider: { userId, provider: provider.toUpperCase() } },
    create: {
      userId,
      provider: provider.toUpperCase(),
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
    update: {
      status: 'CONNECTED',
      lastSyncedAt: new Date(),
    },
  });

  return NextResponse.redirect(`${BASE_URL}/dashboard/biohacking?connected=1&provider=${provider}`);
}
