import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { seedDefaultTemplates, renderTemplate } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET — List all templates (+ auto-seed defaults)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-seed defaults if needed
    await seedDefaultTemplates();

    const templates = await (prisma as any).emailTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error('[email-templates] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — Update a template
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, subject, htmlBody, isActive, description } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (htmlBody !== undefined) updateData.htmlBody = htmlBody;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;

    const updated = await (prisma as any).emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    console.error('[email-templates] PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Send test email or preview
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, slug, testEmail, variables } = await req.json();

    if (action === 'preview') {
      const rendered = await renderTemplate(slug, variables || {
        patientName: 'John Doe',
        portalUrl: '#',
        appointmentDate: '15 February 2026',
        appointmentTime: '10:00 AM',
        therapistName: 'Dr. Bruno',
        location: 'Richmond, London',
        amount: '150.00',
        packageName: 'Standard Package',
        sessions: '10 sessions',
        protocolTitle: 'Rehabilitation Protocol',
        totalSessions: '12',
        deliveryMode: 'In-Clinic',
        assessmentType: 'Body Assessment',
        completedDate: '15 February 2026',
        resetUrl: '#',
        clinicPhone: '+44 7XXX XXXXXX',
      });
      if (!rendered) return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
      return NextResponse.json({ subject: rendered.subject, html: rendered.html });
    }

    if (action === 'sendTest') {
      if (!testEmail || !slug) {
        return NextResponse.json({ error: 'testEmail and slug are required' }, { status: 400 });
      }
      const rendered = await renderTemplate(slug, variables || {
        patientName: 'Test Patient',
        portalUrl: process.env.NEXTAUTH_URL || 'https://bpr.rehab',
        appointmentDate: '15 February 2026',
        appointmentTime: '10:00 AM',
        therapistName: 'Dr. Bruno',
        location: 'Richmond, London',
        amount: '150.00',
        packageName: 'Standard Package',
        sessions: '10 sessions',
        protocolTitle: 'Rehabilitation Protocol',
        totalSessions: '12',
        deliveryMode: 'In-Clinic',
        assessmentType: 'Body Assessment',
        completedDate: '15 February 2026',
        resetUrl: `${process.env.NEXTAUTH_URL || ''}/reset-password?token=test`,
        clinicPhone: '+44 7XXX XXXXXX',
      });
      if (!rendered) return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });

      const result = await sendEmail({ to: testEmail, subject: `[TEST] ${rendered.subject}`, html: rendered.html });
      if (result.success) {
        return NextResponse.json({ success: true, message: `Test email sent to ${testEmail}` });
      } else {
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use: preview, sendTest' }, { status: 400 });
  } catch (err: any) {
    console.error('[email-templates] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
