export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { sendTemplatedEmail } from '@/lib/email-templates';
import { notifyPatient } from '@/lib/notify-patient';

const CANCELLATION_WINDOW_HOURS = 24;

// GET: patient's own cancellation requests
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patientId = effectiveUser.userId;

    const requests = await (prisma as any).cancellationRequest.findMany({
      where: { patientId },
      include: {
        appointment: { select: { id: true, dateTime: true, treatmentType: true, price: true } },
        treatmentPlan: { select: { id: true, name: true, totalPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: patient submits a cancellation request
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patientId = effectiveUser.userId;

    const body = await req.json();
    const { appointmentId, treatmentPlanId, reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Please provide a reason for cancellation.' }, { status: 400 });
    }
    if (!appointmentId && !treatmentPlanId) {
      return NextResponse.json({ error: 'appointmentId or treatmentPlanId is required.' }, { status: 400 });
    }

    // Check for existing pending request
    const existing = await (prisma as any).cancellationRequest.findFirst({
      where: {
        patientId,
        ...(appointmentId ? { appointmentId } : { treatmentPlanId }),
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'A cancellation request already exists for this item.' }, { status: 400 });
    }

    let hoursBeforeAppt: number | null = null;
    let isWithin48h = false;
    let refundEligible = false;
    let refundAmount = 0;
    let policyMessage = '';

    // ── APPOINTMENT cancellation ──
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { payment: true },
      });

      if (!appointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
      if (appointment.patientId !== patientId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
      if (appointment.status === 'CANCELLED') return NextResponse.json({ error: 'Appointment is already cancelled.' }, { status: 400 });

      const now = new Date();
      const apptTime = new Date(appointment.dateTime);
      const diffMs = apptTime.getTime() - now.getTime();
      hoursBeforeAppt = diffMs / (1000 * 60 * 60);
      isWithin48h = hoursBeforeAppt < CANCELLATION_WINDOW_HOURS;

      const totalPaid = appointment.payment?.amount || appointment.price;

      if (isWithin48h) {
        // Within 24h — 50% charge (refund only 50%)
        refundEligible = true;
        refundAmount = Math.round(totalPaid * 0.5 * 100) / 100; // 50% refund
        policyMessage = `Your appointment is in ${Math.round(hoursBeforeAppt)} hours. Under our cancellation policy, cancellations made within 24 hours are subject to a 50% charge. You will receive a refund of £${refundAmount.toFixed(2)} (50% of £${totalPaid.toFixed(2)}). Your request will be reviewed by our team.`;
      } else {
        // More than 24h — full refund eligible
        refundEligible = true;
        refundAmount = totalPaid;
        policyMessage = `Your cancellation request has been received. As you are cancelling more than 24 hours in advance, you are eligible for a full refund of £${refundAmount.toFixed(2)}. Our team will process this within 3–5 business days.`;
      }
    }

    // ── TREATMENT PLAN cancellation ──
    if (treatmentPlanId) {
      const plan = await (prisma as any).treatmentPlan.findUnique({
        where: { id: treatmentPlanId },
      });

      if (!plan) return NextResponse.json({ error: 'Treatment plan not found.' }, { status: 404 });
      if (plan.patientId !== patientId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
      if (plan.status === 'CANCELLED') return NextResponse.json({ error: 'Treatment plan is already cancelled.' }, { status: 400 });

      // Treatment plans: no automatic refund — always requires admin review
      refundEligible = false;
      isWithin48h = false;
      policyMessage = `Your cancellation request for the treatment plan "${plan.name}" has been received. Treatment plan cancellations require manual review by our team, as appointment slots were reserved specifically for you. A member of our team will contact you within 2 business days to discuss your options.`;
    }

    // Create the cancellation request
    const request = await (prisma as any).cancellationRequest.create({
      data: {
        patientId,
        ...(appointmentId ? { appointmentId } : {}),
        ...(treatmentPlanId ? { treatmentPlanId } : {}),
        reason,
        status: 'PENDING',
        hoursBeforeAppt,
        isWithin48h,
        refundAmount: refundEligible ? refundAmount : null,
      },
    });

    // Send cancellation confirmation via preferred channel
    const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
    notifyPatient({
      patientId,
      emailTemplateSlug: 'APPOINTMENT_CANCELLED',
      emailVars: {
        appointmentDate: appointmentId ? 'Your appointment' : 'Your treatment plan',
        appointmentTime: '',
        therapistName: 'Bruno Physical Rehabilitation',
        portalUrl: `${BASE}/dashboard/appointments`,
      },
      plainMessage: `Your cancellation request has been submitted. ${refundEligible ? `A refund of £${refundAmount} is being processed.` : 'Please check our cancellation policy for details.'}`,
      plainMessagePt: `Sua solicitação de cancelamento foi enviada. ${refundEligible ? `Um reembolso de £${refundAmount} está sendo processado.` : 'Consulte nossa política de cancelamento para mais detalhes.'}`,
    }).catch(err => console.error('[cancellation] notification error:', err));

    return NextResponse.json({
      success: true,
      requestId: request.id,
      refundEligible,
      refundAmount: refundEligible ? refundAmount : 0,
      isWithin48h,
      policyMessage,
    });
  } catch (err: any) {
    console.error('[patient-cancellation] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
