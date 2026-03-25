import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Fetch latest manufacturing spec for a foot scan
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

    const spec = await (prisma as any).footScanManufacturingSpec.findFirst({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(spec || null);
  } catch (error) {
    console.error('Error fetching manufacturing spec:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturing spec' }, { status: 500 });
  }
}

// POST - Create or update manufacturing spec draft
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
      return NextResponse.json({ error: 'Only staff can manage manufacturing specs' }, { status: 403 });
    }

    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        order: true,
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
      insoleType = footScan.insoleType || 'Medical',
      sizeSystem = 'EU',
      sizeValue = footScan.insoleSize || null,
      shellGeometry = {},
      heelCupDepth = null,
      archSupport = {},
      posting = {},
      materials = {},
      offloadingZones = {},
      trimline = null,
      shoeCompatibility = null,
      productionNotes = footScan.productionNotes || null,
      reliabilityNotes = footScan.confidenceBand ? `Confidence: ${footScan.confidenceBand}` : null,
      approve = false,
    } = body;

    const latestReview = await (prisma as any).footScanReview.findFirst({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);

    if (!latestReview) {
      return NextResponse.json({ error: 'Clinical review required before manufacturing spec' }, { status: 400 });
    }

    const latestSpec = await (prisma as any).footScanManufacturingSpec.findFirst({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);

    const specVersion = latestSpec ? Number(latestSpec.specVersion || 1) + 1 : 1;

    const spec = await (prisma as any).footScanManufacturingSpec.create({
      data: {
        footScanId: id,
        sourceMeasurementSetId: footScan.currentMeasurementSetId || null,
        sourceReviewId: latestReview.id,
        specVersion,
        insoleType,
        sizeSystem,
        sizeValue,
        shellGeometry,
        heelCupDepth,
        archSupport,
        posting,
        materials,
        offloadingZones,
        trimline,
        shoeCompatibility,
        productionNotes,
        reliabilityNotes,
        labStatus: approve ? 'READY' : 'DRAFT',
        createdById: user.id,
        approvedById: approve ? user.id : null,
        approvedAt: approve ? new Date() : null,
      }
    });

    const updatedScan = await prisma.footScan.update({
      where: { id },
      data: {
        manufacturingStatus: approve ? 'READY' : 'DRAFT',
        workflowStatus: approve ? 'APPROVED_FOR_PRODUCTION' : footScan.workflowStatus,
        manufacturingReport: JSON.stringify({
          specVersion,
          insoleType,
          sizeSystem,
          sizeValue,
          shellGeometry,
          heelCupDepth,
          archSupport,
          posting,
          materials,
          offloadingZones,
          trimline,
          shoeCompatibility,
          productionNotes,
          reliabilityNotes,
        }),
        productionNotes,
        insoleType,
        insoleSize: sizeValue,
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
        eventType: approve ? 'MANUFACTURING_SPEC_APPROVED' : 'MANUFACTURING_SPEC_DRAFTED',
        actorType: 'CLINICIAN',
        actorId: user.id,
        payload: {
          specId: spec.id,
          specVersion,
          approve,
          sourceReviewId: latestReview.id,
        }
      }
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      spec,
      footScan: updatedScan,
    });
  } catch (error) {
    console.error('Error creating manufacturing spec:', error);
    return NextResponse.json({ error: 'Failed to create manufacturing spec' }, { status: 500 });
  }
}
