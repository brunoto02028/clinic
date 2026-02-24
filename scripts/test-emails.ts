// Run: npx tsx scripts/test-emails.ts
import { renderTemplate, seedDefaultTemplates } from '../lib/email-templates';
import { sendEmail } from '../lib/email';

const TEST_EMAIL = 'brunotoaz@gmail.com';
const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';

const TEST_CASES: { slug: string; locale: string; vars: Record<string, string> }[] = [
  { slug: 'WELCOME', locale: 'en-GB', vars: { patientName: 'John Smith', portalUrl: `${BASE}/dashboard`, locale: 'en-GB' } },
  { slug: 'WELCOME', locale: 'pt-BR', vars: { patientName: 'João Silva', portalUrl: `${BASE}/dashboard`, locale: 'pt-BR' } },
  {
    slug: 'APPOINTMENT_CONFIRMATION', locale: 'en-GB',
    vars: { patientName: 'John Smith', appointmentDate: 'Monday, 24 February 2026', appointmentTime: '10:00', therapistName: 'Bruno Toaz', treatmentType: 'Manual Therapy', duration: '60', portalUrl: `${BASE}/dashboard/appointments`, locale: 'en-GB' },
  },
  {
    slug: 'APPOINTMENT_CONFIRMATION', locale: 'pt-BR',
    vars: { patientName: 'João Silva', appointmentDate: 'Segunda-feira, 24 de Fevereiro de 2026', appointmentTime: '10:00', therapistName: 'Bruno Toaz', treatmentType: 'Terapia Manual', duration: '60', portalUrl: `${BASE}/dashboard/appointments`, locale: 'pt-BR' },
  },
  {
    slug: 'APPOINTMENT_REMINDER', locale: 'en-GB',
    vars: { patientName: 'John Smith', appointmentDate: 'Tuesday, 25 February 2026', appointmentTime: '14:30', therapistName: 'Bruno Toaz', treatmentType: 'Electrotherapy', duration: '45', portalUrl: `${BASE}/dashboard/appointments`, locale: 'en-GB' },
  },
  {
    slug: 'APPOINTMENT_REMINDER', locale: 'pt-BR',
    vars: { patientName: 'João Silva', appointmentDate: 'Terça-feira, 25 de Fevereiro de 2026', appointmentTime: '14:30', therapistName: 'Bruno Toaz', treatmentType: 'Electroterapia', duration: '45', portalUrl: `${BASE}/dashboard/appointments`, locale: 'pt-BR' },
  },
  {
    slug: 'APPOINTMENT_CANCELLED', locale: 'en-GB',
    vars: { patientName: 'John Smith', appointmentDate: 'Wednesday, 26 February 2026', appointmentTime: '09:00', therapistName: 'Bruno Toaz', treatmentType: 'Manual Therapy', duration: '60', portalUrl: `${BASE}/dashboard/appointments`, locale: 'en-GB' },
  },
  {
    slug: 'APPOINTMENT_CANCELLED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', appointmentDate: 'Quarta-feira, 26 de Fevereiro de 2026', appointmentTime: '09:00', therapistName: 'Bruno Toaz', treatmentType: 'Terapia Manual', duration: '60', portalUrl: `${BASE}/dashboard/appointments`, locale: 'pt-BR' },
  },
  {
    slug: 'PAYMENT_CONFIRMATION', locale: 'en-GB',
    vars: { patientName: 'John Smith', amount: '350.00', packageName: 'Full Treatment Package — 10 Sessions', sessions: '10', portalUrl: `${BASE}/dashboard/treatment`, locale: 'en-GB' },
  },
  {
    slug: 'PAYMENT_CONFIRMATION', locale: 'pt-BR',
    vars: { patientName: 'João Silva', amount: '350.00', packageName: 'Pacote Completo — 10 Sessões', sessions: '10', portalUrl: `${BASE}/dashboard/treatment`, locale: 'pt-BR' },
  },
  {
    slug: 'TREATMENT_PROTOCOL', locale: 'en-GB',
    vars: { patientName: 'John Smith', protocolTitle: 'Lumbar Rehabilitation Protocol', totalSessions: '12', portalUrl: `${BASE}/dashboard/treatment`, locale: 'en-GB' },
  },
  {
    slug: 'TREATMENT_PROTOCOL', locale: 'pt-BR',
    vars: { patientName: 'João Silva', protocolTitle: 'Protocolo de Reabilitação Lombar', totalSessions: '12', portalUrl: `${BASE}/dashboard/treatment`, locale: 'pt-BR' },
  },
  {
    slug: 'ASSESSMENT_COMPLETED', locale: 'en-GB',
    vars: { patientName: 'John Smith', assessmentType: 'Body Assessment', completedDate: '18 February 2026', portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'en-GB' },
  },
  {
    slug: 'ASSESSMENT_COMPLETED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', assessmentType: 'Avaliação Corporal', completedDate: '18 de Fevereiro de 2026', portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'pt-BR' },
  },
  {
    slug: 'PASSWORD_RESET', locale: 'en-GB',
    vars: { patientName: 'John Smith', resetUrl: `${BASE}/reset-password?token=test-token-123`, portalUrl: `${BASE}/dashboard`, locale: 'en-GB' },
  },
  {
    slug: 'PASSWORD_RESET', locale: 'pt-BR',
    vars: { patientName: 'João Silva', resetUrl: `${BASE}/reset-password?token=test-token-456`, portalUrl: `${BASE}/dashboard`, locale: 'pt-BR' },
  },
  {
    slug: 'SCREENING_RECEIVED', locale: 'en-GB',
    vars: { patientName: 'John Smith', portalUrl: `${BASE}/dashboard/screening`, locale: 'en-GB' },
  },
  {
    slug: 'SCREENING_RECEIVED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', portalUrl: `${BASE}/dashboard/screening`, locale: 'pt-BR' },
  },
  {
    slug: 'DOCUMENT_RECEIVED', locale: 'en-GB',
    vars: { patientName: 'John Smith', documentName: 'GP Referral Letter.pdf', documentType: 'MEDICAL_REFERRAL', portalUrl: `${BASE}/dashboard/documents`, locale: 'en-GB' },
  },
  {
    slug: 'DOCUMENT_RECEIVED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', documentName: 'Carta de Referência Médica.pdf', documentType: 'MEDICAL_REFERRAL', portalUrl: `${BASE}/dashboard/documents`, locale: 'pt-BR' },
  },
  {
    slug: 'BODY_ASSESSMENT_SUBMITTED', locale: 'en-GB',
    vars: { patientName: 'John Smith', portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'en-GB' },
  },
  {
    slug: 'BODY_ASSESSMENT_SUBMITTED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', portalUrl: `${BASE}/dashboard/body-assessments`, locale: 'pt-BR' },
  },
  {
    slug: 'FOOT_SCAN_SUBMITTED', locale: 'en-GB',
    vars: { patientName: 'John Smith', portalUrl: `${BASE}/dashboard/scans`, locale: 'en-GB' },
  },
  {
    slug: 'FOOT_SCAN_SUBMITTED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', portalUrl: `${BASE}/dashboard/scans`, locale: 'pt-BR' },
  },
  {
    slug: 'CONSENT_CONFIRMED', locale: 'en-GB',
    vars: { patientName: 'John Smith', consentDate: '18 February 2026', termsVersion: 'v1.0', ipAddress: '192.168.1.1', portalUrl: `${BASE}/dashboard/consent`, locale: 'en-GB' },
  },
  {
    slug: 'CONSENT_CONFIRMED', locale: 'pt-BR',
    vars: { patientName: 'João Silva', consentDate: '18 de Fevereiro de 2026', termsVersion: 'v1.0', ipAddress: '192.168.1.1', portalUrl: `${BASE}/dashboard/consent`, locale: 'pt-BR' },
  },
  {
    slug: 'BP_HIGH_ALERT', locale: 'en-GB',
    vars: { patientName: 'John Smith', bpReading: '165/105 mmHg', readingDate: '18 February 2026', classification: 'Stage 2 Hypertension', portalUrl: `${BASE}/dashboard/blood-pressure`, locale: 'en-GB' },
  },
  {
    slug: 'BP_HIGH_ALERT', locale: 'pt-BR',
    vars: { patientName: 'João Silva', bpReading: '165/105 mmHg', readingDate: '18 de Fevereiro de 2026', classification: 'Hipertensão Estágio 2', portalUrl: `${BASE}/dashboard/blood-pressure`, locale: 'pt-BR' },
  },
];

async function main() {
  console.log('🌱 Seeding default templates...');
  await seedDefaultTemplates();
  console.log('✅ Templates seeded\n');

  let sent = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    try {
      const rendered = await renderTemplate(tc.slug, tc.vars);
      if (!rendered) {
        console.log(`❌ [${tc.slug}/${tc.locale}] Template not found or inactive`);
        failed++;
        continue;
      }

      const result = await sendEmail({
        to: TEST_EMAIL,
        subject: `[TEST ${tc.locale}] ${rendered.subject}`,
        html: rendered.html,
      });

      if (result.success) {
        console.log(`✅ [${tc.slug}/${tc.locale}] Sent`);
        sent++;
      } else {
        console.log(`❌ [${tc.slug}/${tc.locale}] Failed: ${result.error}`);
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ [${tc.slug}/${tc.locale}] Error: ${err.message}`);
      failed++;
    }

    // Small delay to avoid SMTP rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n📧 Done: ${sent} sent, ${failed} failed → ${TEST_EMAIL}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
