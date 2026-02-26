import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { sendTemplatedEmail } from '@/lib/email-templates';
import { notifyPatient } from '@/lib/notify-patient';

export const dynamic = 'force-dynamic';

// GET — check consent status
export async function GET() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { consentAcceptedAt: true },
  });

  return NextResponse.json({
    consentAcceptedAt: (user as any)?.consentAcceptedAt || null,
  });
}

// POST — accept consent
export async function POST(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (effectiveUser.isImpersonating) return NextResponse.json({ error: 'Read-only during impersonation' }, { status: 403 });

  const userId = effectiveUser.userId;
  const { accepted } = await req.json();

  if (!accepted) {
    return NextResponse.json({ error: 'You must accept the terms' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });

  await prisma.user.update({
    where: { id: userId },
    data: { consentAcceptedAt: new Date() } as any,
  });

  // Send consent confirmation via preferred channel
  notifyPatient({
    patientId: userId,
    emailTemplateSlug: 'CONSENT_CONFIRMED',
    emailVars: {
      consentDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      termsVersion: 'v1.0',
      ipAddress: '',
      portalUrl: `${process.env.NEXTAUTH_URL || 'https://bpr.rehab'}/dashboard`,
    },
    plainMessage: 'Your consent has been recorded. You can now access all features of your patient portal.',
    plainMessagePt: 'Seu consentimento foi registrado. Agora você pode acessar todos os recursos do seu portal do paciente.',
  }).catch(err => console.error('[consent] notification error:', err));

  return NextResponse.json({ success: true, consentAcceptedAt: new Date().toISOString() });
}
