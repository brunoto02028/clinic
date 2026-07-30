import { prisma } from '@/lib/db';
import { getEmailContent, isPt } from '@/lib/email-i18n';

const BASE_URL = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
const CONTACT_EMAIL = 'admin@bpr.rehab';
const CONTACT_PHONE = '';
const EMAIL_LOGO_URL = `${BASE_URL}/uploads/email-logo.png`;
// Bundled white logo (see .dockerignore exceptions) — email clients need a hosted PNG, not a data URI
const EMAIL_WHITE_LOGO_URL = `${BASE_URL}/uploads/email-logo-white.png`;

// Brand palette — matches the public site's `.public-site` theme (app/globals.css):
// bone background, health-moss primary/header, greige secondary, ink text, line borders.
const BRAND_BONE = '#F5F4F1';
const BRAND_PRIMARY = '#4F7361';
const BRAND_PRIMARY_DARK = '#3B5A49';
const BRAND_LINE = '#E4E3DF';
const BRAND_HEALTH_SOFT = '#EDF3EF';

// ─── Dynamic Clinic Settings ───
async function getClinicSettings(): Promise<{ logoUrl: string; whiteLogoUrl: string; phone: string; email: string }> {
  try {
    const s = await prisma.siteSettings.findFirst({ select: { logoUrl: true, phone: true, email: true, screenLogos: true } as any });
    const toAbs = (url: string | null | undefined) => {
      if (!url) return '';
      if (url.startsWith('data:')) return '';
      if (url.startsWith('http')) return url;
      return `${BASE_URL}${url}`;
    };
    // Try to get a real white logo (from screenLogos.landingHeader.darkLogoUrl or similar)
    const sl = (s as any)?.screenLogos as Record<string, { logoUrl?: string; darkLogoUrl?: string }> | undefined;
    const whiteLogoUrl = toAbs(
      sl?.emailHeader?.logoUrl ||
      sl?.landingHeader?.darkLogoUrl ||
      sl?.dashboard?.darkLogoUrl ||
      sl?.login?.darkLogoUrl ||
      ''
    );
    return {
      logoUrl: toAbs((s as any)?.logoUrl),
      whiteLogoUrl,
      phone: (s as any)?.phone || CONTACT_PHONE,
      email: (s as any)?.email || CONTACT_EMAIL,
    };
  } catch {
    return { logoUrl: '', whiteLogoUrl: '', phone: CONTACT_PHONE, email: CONTACT_EMAIL };
  }
}

// ─── Base Layout Wrapper ───
export async function wrapInLayout(content: string, preheader?: string, locale = 'en-GB'): Promise<string> {
  const { logoUrl, whiteLogoUrl, phone, email } = await getClinicSettings();
  const pt = isPt(locale);
  // Header: white logo only (no caption — the logo carries the name and captions get auto-translated by Gmail)
  const headerLogoUrl = whiteLogoUrl || EMAIL_WHITE_LOGO_URL;
  const logoHtml = `<img src="${headerLogoUrl}" alt="BPR Physical Rehabilitation" style="max-height:70px;max-width:240px;display:block;margin:0 auto;" />`;
  // Footer: dynamic clinic logo (falls back to bundled static PNG if not configured)
  const footerLogoHtml = `<img src="${logoUrl || EMAIL_LOGO_URL}" alt="BPR Physical Rehabilitation" style="max-height:52px;max-width:180px;margin:0 auto 12px;display:block;" />`;
  const noReplyText = pt
    ? `Esta é uma mensagem automática &mdash; por favor não responda diretamente a este email.<br>Para nos contactar, utilize os dados acima ou aceda ao seu <a href="${BASE_URL}/dashboard" style="color:#9ca3af;">portal do paciente</a>.`
    : `This is an automated message &mdash; please do not reply to this email.<br>To contact us, use the details above or log in to your <a href="${BASE_URL}/dashboard" style="color:#9ca3af;">patient portal</a>.`;
  const locationText = pt
    ? 'Cuidados online, onde quer que esteja &nbsp;·&nbsp; Clínica presencial em Ipswich, Suffolk IP1'
    : 'Online care, wherever you are &nbsp;·&nbsp; In-person clinic in Ipswich, Suffolk IP1';

  return `<!DOCTYPE html>
<html lang="${pt ? 'pt' : 'en'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${preheader ? `<span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:${BRAND_BONE};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_BONE};">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background-color:${BRAND_PRIMARY};background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,${BRAND_PRIMARY_DARK} 100%);padding:28px 32px;text-align:center;">${logoHtml}</td></tr>
  <tr><td style="padding:36px 32px 24px;">${content}</td></tr>
  <tr><td style="padding:24px 32px 28px;border-top:1px solid ${BRAND_LINE};background:${BRAND_HEALTH_SOFT};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:center;">
      ${footerLogoHtml}
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">${locationText}</p>
      <p style="margin:0 0 8px;font-size:11px;color:#6b7280;">&#128231; <a href="mailto:admin@bpr.rehab" style="color:${BRAND_PRIMARY};text-decoration:none;">admin@bpr.rehab</a></p>
      <p style="margin:10px 0 0;font-size:10px;color:#d1d5db;line-height:1.5;">${noReplyText}</p>
    </td></tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ─── Variable Replacement ───
export function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

// ─── Default Templates (15 total) ───
export const DEFAULT_TEMPLATES = [
  // ── 1. WELCOME ──
  {
    slug: 'WELCOME' as const,
    name: 'Welcome / Registration',
    subject: 'Welcome to BPR Physical Rehabilitation, {{patientName}}!',
    description: 'Sent automatically when a new patient registers',
    variables: ['patientName', 'portalUrl', 'clinicPhone'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Welcome, {{patientName}}! 👋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Thank you for joining <strong>BPR Physical Rehabilitation</strong>. We're thrilled to have you as part of our community.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Your patient portal is now ready. From there you can:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;">✅ Book and manage appointments</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;">✅ Complete your assessment screening</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;">✅ Access your treatment plan and exercises</td></tr>
      <tr><td style="padding:6px 0;color:#374151;font-size:14px;">✅ View clinical notes and assessments</td></tr>
    </table>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Access Your Portal →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">If you have any questions, don't hesitate to reach out. We look forward to supporting your recovery journey.</p>`,
  },
  {
    slug: 'APPOINTMENT_CONFIRMATION' as const,
    name: 'Appointment Confirmation',
    subject: 'Appointment Request Received — {{appointmentDate}}',
    description: 'Sent when an appointment is booked by the patient',
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'therapistName', 'location', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Booking Request Received 📅</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, we've received your consultation request. Click the button below to view the details and complete your payment when you're ready.</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🕐 Time</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentTime}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">👨‍⚕️ Therapist</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{therapistName}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 Location</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{location}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View & Pay →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">Need to reschedule or have questions? Contact us at <a href="mailto:admin@bpr.rehab" style="color:#4F7361;">admin@bpr.rehab</a></p>`,
  },
  {
    slug: 'APPOINTMENT_REMINDER' as const,
    name: 'Appointment Reminder (24h)',
    subject: 'Reminder: Appointment Tomorrow — {{appointmentTime}}',
    description: 'Sent 24 hours before an appointment',
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'therapistName', 'location', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Reminder: Your Appointment is Tomorrow ⏰</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, just a friendly reminder about your upcoming appointment.</p>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🕐 Time</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentTime}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">👨‍⚕️ Therapist</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{therapistName}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">📍 Location</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{location}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">📋 <strong>Please remember to:</strong></p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">• Wear comfortable clothing<br>• Arrive 5 minutes early<br>• Bring any relevant medical documents</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Appointment →</a>
    </div>`,
  },
  {
    slug: 'PAYMENT_CONFIRMATION' as const,
    name: 'Payment Confirmation',
    subject: 'Payment Received — £{{amount}}',
    description: 'Sent after a successful payment',
    variables: ['patientName', 'amount', 'packageName', 'sessions', 'receiptUrl', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Payment Confirmed 💳</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, we've received your payment. Thank you!</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">Amount</td><td style="padding:8px 0;font-size:20px;color:#059669;font-weight:700;">£{{amount}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Package</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{packageName}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Sessions</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{sessions}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Treatment Plan →</a>
    </div>
    <p style="color:#6b7280;font-size:12px;margin:0;">A receipt has been sent to your email. For billing questions, contact us directly.</p>`,
  },
  {
    slug: 'TREATMENT_PROTOCOL' as const,
    name: 'Treatment Protocol Ready',
    subject: 'Your Treatment Plan is Ready, {{patientName}}',
    description: 'Sent when a treatment protocol is created for the patient',
    variables: ['patientName', 'protocolTitle', 'totalSessions', 'deliveryMode', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Your Treatment Plan is Ready 📋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your personalised treatment protocol has been prepared by your therapist.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">Plan</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{protocolTitle}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Sessions</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{totalSessions}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Mode</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{deliveryMode}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Your plan includes exercises, in-clinic sessions, and home care instructions. Log in to view the full details.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Treatment Plan →</a>
    </div>`,
  },
  {
    slug: 'ASSESSMENT_COMPLETED' as const,
    name: 'Assessment Completed',
    subject: '{{assessmentType}} Assessment Complete — Results Available',
    description: 'Sent when a screening, foot scan, or body assessment is completed',
    variables: ['patientName', 'assessmentType', 'completedDate', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Assessment Complete ✅</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your <strong>{{assessmentType}}</strong> assessment has been completed and the results are now available in your portal.</p>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">Assessment</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{assessmentType}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Completed</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{completedDate}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Your therapist will review the results and discuss the findings with you at your next appointment.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Results →</a>
    </div>`,
  },
  {
    slug: 'PASSWORD_RESET' as const,
    name: 'Password Reset',
    subject: 'Reset Your Password — Bruno Rehab',
    description: 'Sent when a patient requests a password reset',
    variables: ['patientName', 'resetUrl'],
    htmlBody: `<h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Password Reset Request 🔒</h2><p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, we received a request to reset your password.</p><div style="text-align:center;margin:28px 0;"><a href="{{resetUrl}}" style="display:inline-block;background-color:#4F7361;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password →</a></div><p style="color:#9ca3af;font-size:12px;margin:0;">This link will expire in 1 hour.</p>`,
  },
  {
    slug: 'APPOINTMENT_CANCELLED' as const,
    name: 'Appointment Cancelled',
    subject: 'Appointment Cancelled — {{appointmentDate}}',
    description: 'Sent when an appointment is cancelled',
    variables: ['patientName', 'appointmentDate', 'appointmentTime', 'therapistName', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Appointment Cancelled</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your appointment has been cancelled as requested. We hope to see you again soon.</p>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🕐 Time</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentTime}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">👨‍⚕️ Therapist</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{therapistName}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Would you like to book a new appointment? You can do so through your portal or by contacting us.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Book a New Appointment →</a>
    </div>`,
  },
  {
    slug: 'WAITLIST_SLOT_AVAILABLE' as const,
    name: 'Waitlist Slot Available',
    subject: 'A slot just opened up — {{appointmentDate}} at {{appointmentTime}}',
    description: 'Sent when a cancelled appointment matches a patient on the waitlist',
    variables: ['patientName', 'treatmentType', 'appointmentDate', 'appointmentTime', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">A Slot Just Opened Up! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, good news — a spot for <strong>{{treatmentType}}</strong> just became available and you're on the waitlist.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:100px;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🕐 Time</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{appointmentTime}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">This slot is offered on a first-come, first-served basis — book it now in your portal before it's gone.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Book This Slot →</a>
    </div>`,
  },
  {
    slug: 'SCREENING_RECEIVED' as const,
    name: 'Assessment Screening Received',
    subject: "Assessment screening received — we'll review it shortly, {{patientName}}",
    description: 'Sent when a patient submits their assessment screening form',
    variables: ['patientName', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Assessment Screening Received 📋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, thank you for completing your assessment screening form. We have received it and your therapist will review it before your appointment.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px 24px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#374151;">✅ Your screening has been securely saved<br>📋 Your therapist will review it prior to your session<br>📞 We may contact you if we need any clarification</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Portal →</a>
    </div>`,
  },
  {
    slug: 'DOCUMENT_RECEIVED' as const,
    name: 'Document Received',
    subject: 'Document received successfully — {{documentName}}',
    description: 'Sent when a patient uploads a document',
    variables: ['patientName', 'documentName', 'documentType', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Document Received ✅</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, we have successfully received your document.</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;">📄 Document</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{documentName}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">📁 Type</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{documentType}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Your therapist will review this document and it will be added to your clinical record.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Documents →</a>
    </div>`,
  },
  {
    slug: 'BODY_ASSESSMENT_SUBMITTED' as const,
    name: 'Body Assessment Submitted',
    subject: 'Body assessment received — analysis in progress, {{patientName}} 🏃',
    description: 'Sent when a patient completes a body assessment capture',
    variables: ['patientName', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Body Assessment Received 🏃</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, your body assessment photos have been received and our AI is now analysing your posture and movement patterns.</p>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:18px 24px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#374151;">📸 Photos received and securely stored<br>🤖 AI analysis in progress<br>👨‍⚕️ Your therapist will review the results</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">You will be notified when your assessment results are ready. This usually takes a few minutes.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Assessment →</a>
    </div>`,
  },
  {
    slug: 'FOOT_SCAN_SUBMITTED' as const,
    name: 'Foot Scan Submitted',
    subject: 'Foot scan received — analysis in progress, {{patientName}} 👣',
    description: 'Sent when a patient submits a foot scan',
    variables: ['patientName', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Foot Scan Received 👣</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, your foot scan has been received and our system is now analysing your foot pressure distribution and gait patterns.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:18px 24px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#374151;">👣 Scan received and securely stored<br>🔬 Pressure analysis in progress<br>📊 Full report will be available shortly</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Your therapist will review the scan results and discuss findings at your next appointment.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Foot Scan →</a>
    </div>`,
  },
  {
    slug: 'CONSENT_CONFIRMED' as const,
    name: 'GDPR Consent Confirmed',
    subject: 'GDPR Consent Confirmed — {{patientName}}',
    description: 'Sent when a patient confirms GDPR consent',
    variables: ['patientName', 'consentDate', 'termsVersion', 'ipAddress', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">GDPR Consent Confirmed ✅</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, this email confirms that your GDPR consent has been recorded. Your data is safe with us.</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{consentDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">📋 Version</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{termsVersion}}</td></tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 20px;">You can withdraw your consent at any time by contacting us at <a href="mailto:admin@bpr.rehab" style="color:#4F7361;">admin@bpr.rehab</a> or through your patient portal.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Portal →</a>
    </div>`,
  },
  {
    slug: 'BP_HIGH_ALERT' as const,
    name: 'Blood Pressure High Alert',
    subject: '⚠️ Blood Pressure Alert — {{patientName}}',
    description: 'Sent when a patient records a high blood pressure reading',
    variables: ['patientName', 'bpReading', 'readingDate', 'classification', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#dc2626;font-size:22px;margin:0 0 16px;">⚠️ Blood Pressure Alert</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, your recent blood pressure reading requires attention. Please review the details below.</p>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;">📊 Reading</td><td style="padding:6px 0;font-size:18px;color:#dc2626;font-weight:700;">{{bpReading}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">📅 Date</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{readingDate}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🏷️ Classification</td><td style="padding:6px 0;font-size:15px;color:#dc2626;font-weight:600;">{{classification}}</td></tr>
      </table>
    </div>
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:0 8px 8px 0;margin:0 0 20px;">
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Important:</strong> If you are experiencing symptoms such as severe headache, chest pain, or shortness of breath, please seek emergency medical attention immediately or call 999.</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Your Health Records →</a>
    </div>`,
  },
  // ── MEMBERSHIP CREATED ──
  {
    slug: 'MEMBERSHIP_CREATED' as const,
    name: 'Membership Plan Activated',
    subject: 'Your {{planName}} membership is now active — BPR Physical Rehabilitation',
    description: 'Sent when a membership plan is assigned/activated for a patient',
    variables: ['patientName', 'planName', 'planPrice', 'planInterval', 'planFeatures', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Membership Activated 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{patientName}}, your <strong>{{planName}}</strong> membership has been activated. You now have access to all included features.</p>
    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;width:120px;">📋 Plan</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{planName}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">💷 Price</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{planPrice}}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">🔄 Billing</td><td style="padding:6px 0;font-size:15px;color:#111827;font-weight:600;">{{planInterval}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;"><strong>Included features:</strong><br>{{planFeatures}}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Access Your Portal →</a>
    </div>`,
  },
  // ── TREATMENT PLAN READY ──
  {
    slug: 'TREATMENT_PLAN_READY' as const,
    name: 'Treatment Plan Ready for Review',
    subject: 'Your Treatment Plan is Ready, {{patientName}} — Review & Accept',
    description: 'Sent when a therapist creates a treatment protocol for a patient',
    variables: ['patientName', 'protocolTitle', 'therapistName', 'totalSessions', 'estimatedWeeks', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Your Treatment Plan is Ready 📋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your therapist <strong>{{therapistName}}</strong> has prepared a personalised treatment plan for you.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">📋 Plan</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{protocolTitle}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Sessions</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{totalSessions}} sessions</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">⏱️ Duration</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">~{{estimatedWeeks}} weeks</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Please log in to review the details and confirm your acceptance to proceed with the treatment.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Review Treatment Plan →</a>
    </div>`,
  },
  // ── PACKAGE READY TO PAY ──
  {
    slug: 'PACKAGE_READY_TO_PAY' as const,
    name: 'Treatment Package — Payment Required',
    subject: 'Payment Required: {{packageName}} — {{patientName}}',
    description: 'Sent when a treatment package is linked to a patient and awaits payment',
    variables: ['patientName', 'packageName', 'totalAmount', 'sessions', 'paymentType', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Treatment Package Ready 💳</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your treatment package is ready. Please complete the payment to begin your sessions.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">📦 Package</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{packageName}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">💷 Total</td><td style="padding:8px 0;font-size:20px;color:#ea580c;font-weight:700;">£{{totalAmount}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Sessions</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{sessions}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">💳 Payment</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{paymentType}}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Complete Payment →</a>
    </div>`,
  },
  // ── PACKAGE PAYMENT CONFIRMED ──
  {
    slug: 'PACKAGE_PAYMENT_CONFIRMED' as const,
    name: 'Treatment Package Payment Confirmed',
    subject: 'Payment Confirmed — {{packageName}}, {{patientName}}',
    description: 'Sent after successful treatment package payment',
    variables: ['patientName', 'packageName', 'amount', 'sessions', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Payment Confirmed ✅</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your payment has been received. Your treatment sessions are now unlocked!</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">📦 Package</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{packageName}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">💷 Paid</td><td style="padding:8px 0;font-size:20px;color:#059669;font-weight:700;">£{{amount}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Sessions</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{sessions}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">You can now view your full treatment plan, track your exercises, and book your sessions through the portal.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Treatment Plan →</a>
    </div>`,
  },
  // ── TREATMENT COMPLETED ──
  {
    slug: 'TREATMENT_COMPLETED' as const,
    name: 'Treatment Completed — Congratulations!',
    subject: 'Congratulations {{patientName}}! Your Treatment is Complete 🎉',
    description: 'Sent when all treatment sessions are completed',
    variables: ['patientName', 'protocolTitle', 'completedSessions', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Treatment Complete! 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, congratulations on completing your <strong>{{protocolTitle}}</strong> treatment plan!</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center;">
      <p style="font-size:48px;margin:0 0 8px;">🏆</p>
      <p style="font-size:18px;font-weight:700;color:#059669;margin:0 0 4px;">{{completedSessions}} Sessions Completed</p>
      <p style="font-size:14px;color:#6b7280;margin:0;">Well done on your commitment to recovery!</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;"><strong>What's next?</strong></p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Stay connected with a membership plan to continue accessing your exercises, educational content, health tracking, and more. Your progress doesn't have to stop here!</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#6d28d9;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">View Membership Plans →</a>
    </div>`,
  },
  // ── MEMBERSHIP OFFER (post-treatment upsell) ──
  {
    slug: 'MEMBERSHIP_OFFER' as const,
    name: 'Membership Offer (Post-Treatment)',
    subject: 'Stay Connected, {{patientName}} — Special Membership Offer 👑',
    description: 'Sent after treatment completion to offer membership',
    variables: ['patientName', 'planName', 'planPrice', 'planInterval', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Stay Connected with Us 👑</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, now that your treatment is complete, we'd love to keep supporting your health journey with a membership plan.</p>
    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">👑 Plan</td><td style="padding:8px 0;font-size:15px;color:#111827;font-weight:600;">{{planName}}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">💷 Price</td><td style="padding:8px 0;font-size:18px;color:#7c3aed;font-weight:700;">{{planPrice}}/{{planInterval}}</td></tr>
      </table>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 4px;"><strong>As a member you'll keep access to:</strong></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="padding:4px 0;color:#374151;font-size:14px;">✅ Exercise video library & personalised routines</td></tr>
      <tr><td style="padding:4px 0;color:#374151;font-size:14px;">✅ Educational health content & articles</td></tr>
      <tr><td style="padding:4px 0;color:#374151;font-size:14px;">✅ Blood pressure & health tracking tools</td></tr>
      <tr><td style="padding:4px 0;color:#374151;font-size:14px;">✅ Progress tracking & clinical records</td></tr>
    </table>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#6d28d9;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Join Now →</a>
    </div>`,
  },
  // ── MEMBERSHIP ACTIVATED ──
  {
    slug: 'MEMBERSHIP_ACTIVATED' as const,
    name: 'Membership Activated',
    subject: 'Welcome to {{planName}}, {{patientName}}! 🎉',
    description: 'Sent when a patient subscribes to a membership plan',
    variables: ['patientName', 'planName', 'planPrice', 'planInterval', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Membership Activated 🎉</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, welcome to the <strong>{{planName}}</strong> membership! Your subscription is now active.</p>
    <div style="background:#f5f3ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center;">
      <p style="font-size:48px;margin:0 0 8px;">👑</p>
      <p style="font-size:18px;font-weight:700;color:#7c3aed;margin:0 0 4px;">{{planName}}</p>
      <p style="font-size:15px;color:#6b7280;margin:0;">{{planPrice}}/{{planInterval}} — Cancel anytime</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">All your plan features are now unlocked. Explore your dashboard to get started!</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Explore Your Dashboard →</a>
    </div>`,
  },
  // ── PATIENT QUESTIONS ──
  {
    slug: 'PATIENT_QUESTIONS' as const,
    name: 'Therapist Questions for Patient',
    subject: 'Your therapist sent you {{questionCount}} question(s) to answer',
    description: 'Sent when admin/therapist sends a question set to a patient via Atlas',
    variables: ['patientName', 'questionCount', 'context', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Questions from Your Therapist 📋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, your therapist has sent you <strong>{{questionCount}} question(s)</strong> to answer before your next appointment.</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#6b7280;">📌 Context</p>
      <p style="margin:6px 0 0;font-size:15px;color:#111827;font-weight:600;">{{context}}</p>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Your answers will help the therapist personalise your treatment. Please take a few minutes to respond through your portal.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Answer Questions →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">Questions? Contact us at <a href="mailto:admin@bpr.rehab" style="color:#4F7361;">admin@bpr.rehab</a></p>`,
  },
  // ── EXERCISE REMINDER ──
  {
    slug: 'EXERCISE_REMINDER' as const,
    name: 'Exercise Reminder',
    subject: 'Time for your exercises, {{patientName}} 💪',
    description: 'Periodic reminder for patients to complete their prescribed exercises',
    variables: ['patientName', 'exerciseCount', 'portalUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Exercise Reminder 💪</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi {{patientName}}, just a friendly reminder to complete your prescribed exercises today. Consistency is key to your recovery!</p>
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center;">
      <p style="font-size:36px;margin:0 0 8px;">🏋️</p>
      <p style="font-size:18px;font-weight:700;color:#92400e;margin:0;">{{exerciseCount}} exercises waiting for you</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{portalUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Start Exercises →</a>
    </div>`,
  },
  // ── ARTICLE NEWSLETTER ──
  {
    slug: 'ARTICLE_NEWSLETTER' as const,
    name: 'Article Newsletter',
    subject: '{{articleTitle}} — BPR Health News',
    description: 'Sent when a new article is published — newsletter format',
    variables: ['recipientName', 'articleTitle', 'articleExcerpt', 'articleImageUrl', 'articleImageBlock', 'articleUrl', 'unsubscribeUrl'],
    htmlBody: `
    <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 20px;">BPR Health News &nbsp;·&nbsp; Latest Article</p>
    {{articleImageBlock}}
    <h2 style="color:#1f2937;font-size:24px;font-weight:700;margin:0 0 16px;line-height:1.3;">{{articleTitle}}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.8;margin:0 0 24px;">{{articleExcerpt}}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{{articleUrl}}" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Read Full Article →</a>
    </div>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">You are receiving this because you subscribed to BPR Health News.<br><a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Unsubscribe</a></p>`,
  },
  // ── Custom — blank starting point for one-off marketing campaigns ──
  {
    slug: 'CUSTOM' as const,
    name: 'Custom / Blank Template',
    subject: 'Your subject here, {{recipientName}}',
    description: 'Blank starting point for one-off campaigns — edit freely and use as a Custom Template in a new campaign',
    variables: ['recipientName', 'firstName', 'lastName', 'email', 'unsubscribeUrl'],
    htmlBody: `
    <h2 style="color:#20242D;font-size:22px;margin:0 0 16px;">Hi {{firstName}}, 👋</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Write your message here. This is a blank template you can fully customise for one-off announcements, promotions, or updates.</p>
    <div style="background:#EDF3EF;border:1px solid #CFE0D6;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Use this box to highlight a key message, offer, or call to action.</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://bpr.rehab" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Call to Action →</a>
    </div>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="{{unsubscribeUrl}}" style="color:#9ca3af;">Unsubscribe</a></p>`,
  },
];

// ─── Render a template with variables ───
// If variables.locale is provided, bilingual content overrides DB htmlBody/subject
export async function renderTemplate(
  slug: string,
  variables: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  try {
    const template = await (prisma as any).emailTemplate.findUnique({ where: { slug: slug as any } });
    if (!template || !template.isActive) return null;

    const locale = variables.locale || 'en-GB';
    const i18n = getEmailContent(slug, locale);

    const rawSubject = i18n ? i18n.subject : template.subject;
    const rawBody    = i18n ? i18n.body    : template.htmlBody;

    const subject = replaceVariables(rawSubject, variables);
    const body    = replaceVariables(rawBody, variables);
    const html    = await wrapInLayout(body, subject, locale);

    return { subject, html };
  } catch (err) {
    console.error('[email-templates] render error:', err);
    return null;
  }
}

// ─── Resolve patient locale from DB ───
export async function getPatientLocale(patientId: string): Promise<string> {
  try {
    const u = await (prisma as any).user.findUnique({ where: { id: patientId }, select: { preferredLocale: true } });
    return u?.preferredLocale || 'pt-BR';
  } catch { return 'pt-BR'; }
}

// ─── Send a templated email ───
export async function sendTemplatedEmail(
  slug: string,
  to: string,
  variables: Record<string, string>,
  patientId?: string,
  clinicId?: string,
): Promise<boolean> {
  const { sendEmail } = await import('@/lib/email');

  // Auto-inject locale if patientId provided and locale not already set
  if (patientId && !variables.locale) {
    variables = { ...variables, locale: await getPatientLocale(patientId) };
  }

  const rendered = await renderTemplate(slug, variables);
  if (!rendered) {
    console.warn(`[email-templates] Template ${slug} not found or inactive`);
    return false;
  }

  // Auto-BCC admin on all patient emails
  const adminBcc = process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com';
  const bccList = to.toLowerCase() !== adminBcc.toLowerCase() ? adminBcc : undefined;

  const result = await sendEmail({ to, subject: rendered.subject, html: rendered.html, bcc: bccList });

  // Log outbound email
  try {
    await (prisma as any).emailMessage.create({
      data: {
        direction: 'OUTBOUND',
        folder: 'SENT',
        fromAddress: process.env.EMAIL_FROM || 'admin@bpr.rehab',
        fromName: 'BPR Physical Rehabilitation',
        toAddress: to,
        toName: variables.patientName || null,
        subject: rendered.subject,
        htmlBody: rendered.html,
        isRead: true,
        templateSlug: slug,
        patientId: patientId || null,
        clinicId: clinicId || null,
        sentAt: new Date(),
        messageId: (result as any)?.data?.messageId || null,
      },
    });
  } catch (logErr) {
    console.warn('[email-templates] Failed to log sent email:', logErr);
  }

  return result.success === true;
}

// ─── Seed default templates ───
export async function seedDefaultTemplates(): Promise<number> {
  let count = 0;
  for (const tmpl of DEFAULT_TEMPLATES) {
    const existing = await (prisma as any).emailTemplate.findUnique({ where: { slug: tmpl.slug } });
    if (!existing) {
      await (prisma as any).emailTemplate.create({
        data: {
          slug: tmpl.slug,
          name: tmpl.name,
          subject: tmpl.subject,
          htmlBody: tmpl.htmlBody,
          variables: tmpl.variables,
          description: tmpl.description,
          isActive: true,
        },
      });
      count++;
    }
  }
  return count;
}
