import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';
import { isDbUnreachableError, MOCK_FOOT_SCANS, devFallbackResponse } from '@/lib/dev-fallback';
import { getEffectiveUserId, isPreviewRequest } from '@/lib/preview-helpers';

// Generate unique scan number
async function generateScanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FS-${year}-`;
  
  const lastScan = await prisma.footScan.findFirst({
    where: { scanNumber: { startsWith: prefix } },
    orderBy: { scanNumber: 'desc' }
  });
  
  let nextNumber = 1;
  if (lastScan) {
    const lastNumber = parseInt(lastScan.scanNumber.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET - List foot scans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    
    const effectiveId = getEffectiveUserId(session, request);
    const isPreview = isPreviewRequest(session, request);
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Build query based on role
    let whereClause: any = {};
    
    if (user.role === 'PATIENT' || isPreview) {
      whereClause.patientId = isPreview ? effectiveId : user.id;
    } else if (user.clinicId) {
      whereClause.clinicId = user.clinicId;
      if (patientId) {
        whereClause.patientId = patientId;
      }
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    const footScans = await prisma.footScan.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        order: {
          select: { id: true, orderNumber: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Generate signed URLs for private files (skip S3 for local files)
    const scansWithUrls = await Promise.all(footScans.map(async (scan) => {
      let scanUrl = scan.scanUrl;
      let previewUrl = scan.previewUrl;
      let pressureMapUrl = scan.pressureMapUrl;
      
      try {
        if (scan.scanPath && !scan.scanPath.includes('public/')) {
          scanUrl = await getFileUrl(scan.scanPath, false);
        }
        if (scan.previewPath && !scan.previewPath.includes('public/')) {
          previewUrl = await getFileUrl(scan.previewPath, false);
        }
        if (scan.pressureMapPath && !scan.pressureMapPath.includes('public/')) {
          pressureMapUrl = await getFileUrl(scan.pressureMapPath, false);
        }
      } catch {
        // S3 unavailable — use stored URLs as-is
      }
      
      return { ...scan, scanUrl, previewUrl, pressureMapUrl };
    }));
    
    return NextResponse.json(scansWithUrls);
    
  } catch (error) {
    console.error('Error fetching foot scans:', error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_FOOT_SCANS);
    }
    return NextResponse.json({ error: 'Failed to fetch foot scans' }, { status: 500 });
  }
}

// POST - Create new foot scan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { patientId } = body;
    
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Determine patient ID - if user is patient, use their ID
    const actualPatientId = user.role === 'PATIENT' ? user.id : patientId;
    
    if (!actualPatientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }
    
    // Get clinicId — try user's, then patient's, then any clinic as fallback
    let clinicId = user.clinicId;
    if (!clinicId && actualPatientId !== user.id) {
      const pat = await prisma.user.findUnique({ where: { id: actualPatientId }, select: { clinicId: true } });
      clinicId = pat?.clinicId || null;
    }
    if (!clinicId) {
      const anyClinic = await (prisma as any).clinic.findFirst({ select: { id: true } });
      clinicId = anyClinic?.id || null;
    }
    
    // Verify patient exists if admin creating for a patient
    if (user.role !== 'PATIENT' && clinicId) {
      const patient = await prisma.user.findFirst({
        where: { id: actualPatientId, role: 'PATIENT' }
      });
      if (!patient) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
    }
    
    const scanNumber = await generateScanNumber();
    
    const footScan = await prisma.footScan.create({
      data: {
        scanNumber,
        clinicId: clinicId as string,
        patientId: actualPatientId,
        status: 'PENDING_UPLOAD'
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
    
    return NextResponse.json(footScan, { status: 201 });
    
  } catch (error) {
    console.error('Error creating foot scan:', error);
    return NextResponse.json({ error: 'Failed to create foot scan' }, { status: 500 });
  }
}
