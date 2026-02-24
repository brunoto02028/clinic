import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Get comparison data: current scan vs previous scans of the same patient
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

    if (!user || user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get current scan
    const currentScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    if (!currentScan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (user.clinicId !== currentScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all other scans for this patient (that have analysis data), ordered by date
    const allScans = await prisma.footScan.findMany({
      where: {
        patientId: currentScan.patientId,
        clinicId: currentScan.clinicId,
        id: { not: id },
        status: { in: ['PENDING_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        scanNumber: true,
        createdAt: true,
        status: true,
        archType: true,
        archIndex: true,
        pronation: true,
        calcanealAlignment: true,
        halluxValgusAngle: true,
        metatarsalSpread: true,
        navicularHeight: true,
        leftFootLength: true,
        rightFootLength: true,
        leftFootWidth: true,
        rightFootWidth: true,
        leftArchHeight: true,
        rightArchHeight: true,
        strideLength: true,
        cadence: true,
        insoleType: true,
        leftFootImages: true,
        rightFootImages: true,
      }
    });

    // Build comparison metrics for current scan
    const currentMetrics = {
      id: currentScan.id,
      scanNumber: currentScan.scanNumber,
      date: currentScan.createdAt,
      status: currentScan.status,
      archType: currentScan.archType,
      archIndex: currentScan.archIndex,
      pronation: currentScan.pronation,
      calcanealAlignment: currentScan.calcanealAlignment,
      halluxValgusAngle: currentScan.halluxValgusAngle,
      metatarsalSpread: currentScan.metatarsalSpread,
      navicularHeight: currentScan.navicularHeight,
      leftFootLength: currentScan.leftFootLength,
      rightFootLength: currentScan.rightFootLength,
      leftFootWidth: currentScan.leftFootWidth,
      rightFootWidth: currentScan.rightFootWidth,
      leftArchHeight: currentScan.leftArchHeight,
      rightArchHeight: currentScan.rightArchHeight,
      strideLength: currentScan.strideLength,
      cadence: currentScan.cadence,
      leftFootImages: currentScan.leftFootImages,
      rightFootImages: currentScan.rightFootImages,
    };

    // Calculate trends if previous scans exist
    let trends = null;
    if (allScans.length > 0) {
      const prev = allScans[0]; // Most recent previous scan
      trends = {
        comparedTo: prev.scanNumber,
        comparedDate: prev.createdAt,
        changes: {
          archIndex: currentScan.archIndex && prev.archIndex
            ? { current: currentScan.archIndex, previous: prev.archIndex, delta: currentScan.archIndex - prev.archIndex }
            : null,
          calcanealAlignment: currentScan.calcanealAlignment != null && prev.calcanealAlignment != null
            ? { current: currentScan.calcanealAlignment, previous: prev.calcanealAlignment, delta: currentScan.calcanealAlignment - prev.calcanealAlignment }
            : null,
          halluxValgusAngle: currentScan.halluxValgusAngle != null && prev.halluxValgusAngle != null
            ? { current: currentScan.halluxValgusAngle, previous: prev.halluxValgusAngle, delta: currentScan.halluxValgusAngle - prev.halluxValgusAngle }
            : null,
          leftFootLength: currentScan.leftFootLength && prev.leftFootLength
            ? { current: currentScan.leftFootLength, previous: prev.leftFootLength, delta: currentScan.leftFootLength - prev.leftFootLength }
            : null,
          leftArchHeight: currentScan.leftArchHeight && prev.leftArchHeight
            ? { current: currentScan.leftArchHeight, previous: prev.leftArchHeight, delta: currentScan.leftArchHeight - prev.leftArchHeight }
            : null,
          rightArchHeight: currentScan.rightArchHeight && prev.rightArchHeight
            ? { current: currentScan.rightArchHeight, previous: prev.rightArchHeight, delta: currentScan.rightArchHeight - prev.rightArchHeight }
            : null,
        }
      };
    }

    return NextResponse.json({
      patient: {
        name: `${currentScan.patient.firstName} ${currentScan.patient.lastName}`,
      },
      current: currentMetrics,
      previousScans: allScans,
      totalScans: allScans.length + 1,
      trends,
    });

  } catch (error) {
    console.error('Error fetching comparison data:', error);
    return NextResponse.json({ error: 'Failed to fetch comparison data' }, { status: 500 });
  }
}
