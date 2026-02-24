import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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

    return NextResponse.json({
      id: footScan.id,
      scanNumber: footScan.scanNumber,
      status: footScan.status,
      leftImageCount: leftImages.length,
      rightImageCount: rightImages.length,
      totalImages: leftImages.length + rightImages.length,
      leftImages,
      rightImages,
      lastUpdated: footScan.updatedAt.toISOString(),
      captureMode: metadata?.captureMode || null,
      device: metadata?.device || null,
    });

  } catch (error) {
    console.error('Error fetching scan progress:', error);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
