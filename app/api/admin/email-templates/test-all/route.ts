export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { renderTemplate } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';

const TEST_EMAIL = 'brunotoaz@gmail.com';
const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';

const TEST_CASES: { slug: string; vars: Record<string, string>; locale: string }[] = [
  {
    slug: 'WELCOME',
    locale: 'en-GB',
    vars: { patientName: 'John Smith', portalUrl: `${BASE}/dashboard`, locale: 'en-GB' },
  },
  {
    slug: 'WELCOME',
    locale: 'pt-BR',
    vars: { patientName: 'João Silva', portalUrl: `${BASE}/dashboard`, locale: 'pt-BR' },
  },
  {
    slug: 'APPOINTMENT_CONFIRMATION',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', appointmentDate: 'Monday, 24 February 2026',
      appointmentTime: '10:00', therapistName: 'Bruno Toaz',
      treatmentType: 'Manual Therapy', duration: '60',
      portalUrl: `${BASE}/dashboard/appointments`, locale: 'en-GB',
    },
  },
  {
    slug: 'APPOINTMENT_CONFIRMATION',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva', appointmentDate: 'Segunda-feira, 24 de Fevereiro de 2026',
      appointmentTime: '10:00', therapistName: 'Bruno Toaz',
      treatmentType: 'Terapia Manual', duration: '60',
      portalUrl: `${BASE}/dashboard/appointments`, locale: 'pt-BR',
    },
  },
  {
    slug: 'APPOINTMENT_REMINDER',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', appointmentDate: 'Tuesday, 25 February 2026',
      appointmentTime: '14:30', therapistName: 'Bruno Toaz',
      treatmentType: 'Electrotherapy', duration: '45',
      portalUrl: `${BASE}/dashboard/appointments`, locale: 'en-GB',
    },
  },
  {
    slug: 'APPOINTMENT_CANCELLED',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva', appointmentDate: 'Quarta-feira, 26 de Fevereiro de 2026',
      appointmentTime: '09:00', therapistName: 'Bruno Toaz',
      portalUrl: `${BASE}/dashboard/appointments`, locale: 'pt-BR',
    },
  },
  {
    slug: 'PAYMENT_CONFIRMATION',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', amount: '350.00',
      packageName: 'Full Treatment Package — 10 Sessions',
      sessions: '10', portalUrl: `${BASE}/dashboard/treatment`, locale: 'en-GB',
    },
  },
  {
    slug: 'TREATMENT_PROTOCOL',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva',
      protocolTitle: 'Protocolo de Reabilitação Lombar',
      totalSessions: '12',
      portalUrl: `${BASE}/dashboard/treatment`, locale: 'pt-BR',
    },
  },
  {
    slug: 'ASSESSMENT_COMPLETED',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', assessmentType: 'Body Assessment',
      completedDate: '18 February 2026',
      portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'en-GB',
    },
  },
  {
    slug: 'SCREENING_RECEIVED',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva',
      portalUrl: `${BASE}/dashboard/screening`, locale: 'pt-BR',
    },
  },
  {
    slug: 'DOCUMENT_RECEIVED',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', documentName: 'GP Referral Letter.pdf',
      documentType: 'MEDICAL_REFERRAL',
      portalUrl: `${BASE}/dashboard/documents`, locale: 'en-GB',
    },
  },
  {
    slug: 'BODY_ASSESSMENT_SUBMITTED',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva',
      portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'pt-BR',
    },
  },
  {
    slug: 'FOOT_SCAN_SUBMITTED',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith',
      portalUrl: `${BASE}/dashboard/scans`, locale: 'en-GB',
    },
  },
  {
    slug: 'CONSENT_CONFIRMED',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva', consentDate: '18 de Fevereiro de 2026',
      termsVersion: 'v1.0', ipAddress: '192.168.1.1',
      portalUrl: `${BASE}/dashboard/consent`, locale: 'pt-BR',
    },
  },
  {
    slug: 'BP_HIGH_ALERT',
    locale: 'en-GB',
    vars: {
      patientName: 'John Smith', bpReading: '165/105 mmHg',
      readingDate: '18 February 2026', classification: 'Stage 2 Hypertension',
      portalUrl: `${BASE}/dashboard/blood-pressure`, locale: 'en-GB',
    },
  },
  {
    slug: 'PASSWORD_RESET',
    locale: 'pt-BR',
    vars: {
      patientName: 'João Silva',
      resetUrl: `${BASE}/reset-password?token=test-token-123`,
      portalUrl: `${BASE}/dashboard`, locale: 'pt-BR',
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: { slug: string; locale: string; success: boolean; error?: string }[] = [];

    for (const tc of TEST_CASES) {
      try {
        const rendered = await renderTemplate(tc.slug, tc.vars);
        if (!rendered) {
          results.push({ slug: tc.slug, locale: tc.locale, success: false, error: 'Template not found or inactive' });
          continue;
        }

        const res = await sendEmail({
          to: TEST_EMAIL,
          subject: `[TEST ${tc.locale}] ${rendered.subject}`,
          html: rendered.html,
        });

        results.push({ slug: tc.slug, locale: tc.locale, success: res.success === true });
      } catch (err: any) {
        results.push({ slug: tc.slug, locale: tc.locale, success: false, error: err.message });
      }
    }

    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Sent ${sent}/${results.length} emails to ${TEST_EMAIL}`,
      sent,
      failed,
      results,
    });
  } catch (err: any) {
    console.error('[test-all-emails] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
