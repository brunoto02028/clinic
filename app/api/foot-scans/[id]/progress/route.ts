import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Get real-time scan progress (used by admin polling)
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

    const footScan = await prisma.footScan.findUnique({
      where: { id },
      select: {
        id: true,
        scanNumber: true,
        status: true,
        workflowStatus: true,
        currentSessionId: true,
        currentMeasurementSetId: true,
        currentAnalysisId: true,
        clinicalStatus: true,
        manufacturingStatus: true,
        confidenceBand: true,
        leftFootImages: true,
        rightFootImages: true,
        captureMetadata: true,
        updatedAt: true,
      }
    });

    if (!footScan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const leftImages = (footScan.leftFootImages as string[]) || [];
    const rightImages = (footScan.rightFootImages as string[]) || [];
    const metadata = footScan.captureMetadata as any;

    const sessionRecord = footScan.currentSessionId
      ? await (prisma as any).footScanSession.findUnique({ where: { id: footScan.currentSessionId } }).catch(() => null)
      : null;

    const captureRows = footScan.currentSessionId
      ? await (prisma as any).footScanCapture.findMany({
          where: { footScanId: id, footScanSessionId: footScan.currentSessionId },
          orderBy: [{ uploadedAt: 'asc' }]
        }).catch(() => [])
      : [];

    const measurementSet = footScan.currentMeasurementSetId
      ? await (prisma as any).footScanMeasurementSet.findUnique({ where: { id: footScan.currentMeasurementSetId } }).catch(() => null)
      : null;

    const analysisRecord = footScan.currentAnalysisId
      ? await (prisma as any).footScanAnalysis.findUnique({ where: { id: footScan.currentAnalysisId } }).catch(() => null)
      : null;

    const latestReview = await (prisma as any).footScanReview.findFirst({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);

    const latestManufacturingSpec = await (prisma as any).footScanManufacturingSpec.findFirst({
      where: { footScanId: id },
      orderBy: { createdAt: 'desc' }
    }).catch(() => null);

    const acceptedOrUploaded = Array.isArray(captureRows)
      ? captureRows.filter((row: any) => row.status === 'UPLOADED' || row.status === 'ACCEPTED')
      : [];

    const leftCaptureRows = acceptedOrUploaded.filter((row: any) => row.side === 'LEFT');
    const rightCaptureRows = acceptedOrUploaded.filter((row: any) => row.side === 'RIGHT');

    const leftCaptureUrls = leftCaptureRows.map((row: any) => row.storageUrl);
    const rightCaptureUrls = rightCaptureRows.map((row: any) => row.storageUrl);

    return NextResponse.json({
      id: footScan.id,
      scanNumber: footScan.scanNumber,
      status: footScan.status,
      workflowStatus: footScan.workflowStatus,
      clinicalStatus: footScan.clinicalStatus,
      manufacturingStatus: footScan.manufacturingStatus,
      confidenceBand: footScan.confidenceBand,

      leftImageCount: leftCaptureUrls.length || leftImages.length,
      rightImageCount: rightCaptureUrls.length || rightImages.length,
      totalImages: (leftCaptureUrls.length + rightCaptureUrls.length) || (leftImages.length + rightImages.length),
      leftImages: leftCaptureUrls.length ? leftCaptureUrls : leftImages,
      rightImages: rightCaptureUrls.length ? rightCaptureUrls : rightImages,
      lastUpdated: footScan.updatedAt.toISOString(),
      captureMode: sessionRecord?.mode || metadata?.captureMode || null,
      capturePathway: sessionRecord?.pathway || null,
      sessionStatus: sessionRecord?.sessionStatus || null,
      currentSessionId: footScan.currentSessionId,
      currentMeasurementSetId: footScan.currentMeasurementSetId,
      currentAnalysisId: footScan.currentAnalysisId,
      measurementStatus: measurementSet?.status || null,
      analysisStatus: analysisRecord?.status || null,
      reviewStatus: latestReview?.status || null,
      manufacturingSpecStatus: latestManufacturingSpec?.labStatus || null,
      manufacturingSpecVersion: latestManufacturingSpec?.specVersion || null,
      device: sessionRecord?.deviceInfo || metadata?.device || null,
      captures: acceptedOrUploaded.map((row: any) => ({
        id: row.id,
        side: row.side,
        view: row.view,
        status: row.status,
        storageUrl: row.storageUrl,
        uploadedAt: row.uploadedAt,
      })),
    });

  } catch (error) {
    console.error('Error fetching scan progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
