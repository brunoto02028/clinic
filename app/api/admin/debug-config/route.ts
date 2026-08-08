// TEMPORARY diagnostic route — investigating why getConfigValue('OPENROUTER_API_KEY')
// returns falsy in production despite the DB row being active with a value.
// Remove after diagnosis.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getConfigValue, decryptValue } from '@/lib/system-config';
import { checkClaudeHealth } from '@/lib/claude';

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

  let resolvedKey = '';
  try {
    const viaGetConfigValue = await getConfigValue('OPENROUTER_API_KEY');
    resolvedKey = viaGetConfigValue || '';
    result.getConfigValueResult = viaGetConfigValue ? `truthy, length=${viaGetConfigValue.length}, suffix=${viaGetConfigValue.slice(-6)}` : `falsy: ${JSON.stringify(viaGetConfigValue)}`;
    // Reveal hidden whitespace/newlines without exposing the full secret
    result.firstCharsJson = JSON.stringify(viaGetConfigValue?.slice(0, 8));
    result.lastCharsJson = JSON.stringify(viaGetConfigValue?.slice(-8));
    result.trimmedLength = viaGetConfigValue?.trim().length;
  } catch (e: any) {
    result.getConfigValueError = e.message;
  }

  result.envHasKey = !!process.env.OPENROUTER_API_KEY;
  result.nextAuthSecretSet = !!process.env.NEXTAUTH_SECRET;

  // Live test call to OpenRouter with the resolved key, mirroring checkClaudeHealth's request exactly
  if (resolvedKey) {
    try {
      const headerValue = `Bearer ${resolvedKey}`;
      result.authHeaderLength = headerValue.length;
      result.authHeaderJson = JSON.stringify(headerValue.slice(0, 15) + '...' + headerValue.slice(-8));
      const testRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': headerValue,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://bpr.rehab',
          'X-Title': 'BPR Clinic AI',
        },
        body: JSON.stringify({ model: 'anthropic/claude-sonnet-5', max_tokens: 10, messages: [{ role: 'user', content: 'ping' }] }),
      });
      result.liveTestStatus = testRes.status;
      result.liveTestBody = (await testRes.text()).slice(0, 300);
    } catch (e: any) {
      result.liveTestError = e.message;
    }
  }

  // Call the real checkClaudeHealth() right after, in the same request/process,
  // to compare against the manual test above.
  try {
    result.checkClaudeHealthResult = await checkClaudeHealth();
  } catch (e: any) {
    result.checkClaudeHealthError = e.message;
  }

  return NextResponse.json(result);
}
