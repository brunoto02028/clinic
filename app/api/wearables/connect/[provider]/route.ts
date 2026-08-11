export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { owCreateUser, owGetAuthUrl } from '@/lib/open-wearables';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.clinic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;
  const userId = session.user.id;

  let connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase() },
  });

  let owUserId = connection?.owUserId;

  if (!owUserId) {
    const owUser = await owCreateUser(
      session.user.email || `${userId}@bpr.clinic`,
      userId
    );
    owUserId = owUser.id;

    if (connection) {
      await (prisma as any).wearableConnection.update({
        where: { id: connection.id },
        data: { owUserId },
      });
    }
  }

  const redirectUri = `${BASE_URL}/api/wearables/callback?provider=${provider}&userId=${userId}`;
  const { authorization_url } = await owGetAuthUrl(provider, owUserId, redirectUri);

  return NextResponse.redirect(authorization_url);
}
