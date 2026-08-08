// TEMPORARY diagnostic route — investigating why getConfigValue('OPENROUTER_API_KEY')
// returns falsy in production despite the DB row being active with a value.
// Remove after diagnosis.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getConfigValue, decryptValue } from '@/lib/system-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result: any = {};

  try {
    const raw = await prisma.systemConfig.findUnique({ where: { key: 'OPENROUTER_API_KEY' } });
    result.rawRow = raw ? {
      id: raw.id,
      isActive: raw.isActive,
      isSecret: raw.isSecret,
      valueLength: raw.value?.length,
      valuePreview: raw.value?.slice(0, 20),
    } : null;
    if (raw?.value) {
      try {
        const dec = decryptValue(raw.value);
        result.decryptedLength = dec.length;
        result.decryptedSuffix = dec.slice(-6);
        result.decryptedLooksLikeSkOr = dec.startsWith('sk-or-');
      } catch (e: any) {
        result.decryptError = e.message;
      }
    }
  } catch (e: any) {
    result.rawQueryError = e.message;
  }

  try {
    const viaGetConfigValue = await getConfigValue('OPENROUTER_API_KEY');
    result.getConfigValueResult = viaGetConfigValue ? `truthy, length=${viaGetConfigValue.length}, suffix=${viaGetConfigValue.slice(-6)}` : `falsy: ${JSON.stringify(viaGetConfigValue)}`;
  } catch (e: any) {
    result.getConfigValueError = e.message;
  }

  result.envHasKey = !!process.env.OPENROUTER_API_KEY;
  result.nextAuthSecretSet = !!process.env.NEXTAUTH_SECRET;

  return NextResponse.json(result);
}
