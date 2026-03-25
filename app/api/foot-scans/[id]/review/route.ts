import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Submit clinical review for a foot scan
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });

    if (!user || !user.clinicId) {
      return NextResponse.json({ error: 'User or clinic not found' }, { status: 404 });
    }

    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Only staff can review foot scans' }, { status: 403 });
    }

    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }

    if (footScan.clinicId !== user.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status = 'VERIFIED',
      clinicianFindings = {},
      overriddenMeasurements = null,
      overrideReason = null,
      notes = '',
      approveForProduction = false,
    } = body;

    const measurementSetId = footScan.currentMeasurementSetId;
    if (!measurementSetId) {
      return NextResponse.json({ error: 'No measurement set available for review' }, { status: 400 });
    }

    const review = await (prisma as any).footScanReview.create({
      data: {
        footScanId: id,
        measurementSetId,
        analysisId: footScan.currentAnalysisId || null,
        reviewerId: user.id,
        status: approveForProduction ? 'APPROVED_FOR_PRODUCTION' : status,
        clinicianFindings,
        overriddenMeasurements,
        overrideReason,
        notes,
        completedAt: new Date(),
      }
    });

    const updatedScan = await prisma.footScan.update({
      where: { id },
      data: {
        reviewedById: user.id,
        reviewedAt: new Date(),
        clinicianNotes: notes || footScan.clinicianNotes,
        clinicalStatus: approveForProduction ? 'APPROVED_FOR_PRODUCTION' : status,
        workflowStatus: approveForProduction ? 'APPROVED_FOR_PRODUCTION' : 'CLINICAL_REVIEW_PENDING',
        status: approveForProduction ? 'APPROVED' : 'PENDING_REVIEW',
        approvedById: approveForProduction ? user.id : footScan.approvedById,
        approvedAt: approveForProduction ? new Date() : footScan.approvedAt,
        manufacturingReadyAt: approveForProduction ? new Date() : footScan.manufacturingReadyAt,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        order: true,
      }
    });

    await (prisma as any).footScanEvent.create({
      data: {
        footScanId: id,
        sessionId: footScan.currentSessionId || null,
        eventType: approveForProduction ? 'CLINICAL_REVIEW_APPROVED_FOR_PRODUCTION' : 'CLINICAL_REVIEW_COMPLETED',
        actorType: 'CLINICIAN',
        actorId: user.id,
        payload: {
          reviewId: review.id,
          measurementSetId,
          analysisId: footScan.currentAnalysisId || null,
          status: approveForProduction ? 'APPROVED_FOR_PRODUCTION' : status,
          approveForProduction,
        }
      }
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      review,
      footScan: updatedScan,
    });
  } catch (error) {
    console.error('Error submitting foot scan review:', error);
    return NextResponse.json({ error: 'Failed to submit foot scan review' }, { status: 500 });
  }
}

// GET - List clinical reviews for a foot scan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });

    if (!user || !user.clinicId) {
      return NextResponse.json({ error: 'User or clinic not found' }, { status: 404 });
    }

    const footScan = await prisma.footScan.findUnique({
      where: { id },
      select: { clinicId: true }
    });

    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }

    if (footScan.clinicId !== user.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const reviews = await (prisma as any).footScanReview.findMany({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching foot scan reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch foot scan reviews' }, { status: 500 });
  }
}
