import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getFileUrl, deleteFile } from '@/lib/s3';

// GET - Get single foot scan
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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        order: true
      }
    });
    
    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    // Check access
    if (user.role === 'PATIENT' && footScan.patientId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (user.role !== 'PATIENT' && user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Generate signed URLs for private files
    let scanUrl = footScan.scanUrl;
    let previewUrl = footScan.previewUrl;
    let pressureMapUrl = footScan.pressureMapUrl;
    
    if (footScan.scanPath && !footScan.scanPath.includes('public/')) {
      scanUrl = await getFileUrl(footScan.scanPath, false);
    }
    if (footScan.previewPath && !footScan.previewPath.includes('public/')) {
      previewUrl = await getFileUrl(footScan.previewPath, false);
    }
    if (footScan.pressureMapPath && !footScan.pressureMapPath.includes('public/')) {
      pressureMapUrl = await getFileUrl(footScan.pressureMapPath, false);
    }
    
    return NextResponse.json({ ...footScan, scanUrl, previewUrl, pressureMapUrl });
    
  } catch (error) {
    console.error('Error fetching foot scan:', error);
    return NextResponse.json({ error: 'Failed to fetch foot scan' }, { status: 500 });
  }
}

// PUT/PATCH - Update foot scan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true, canManageFootScans: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const existingScan = await prisma.footScan.findUnique({
      where: { id }
    });
    
    if (!existingScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    // Check access
    if (user.clinicId !== existingScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Patients can only update camera images during capture
    if (user.role === 'PATIENT') {
      if (existingScan.patientId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // Only allow updating images and capture metadata
      const allowedFields = ['leftFootImages', 'rightFootImages', 'captureMetadata'];
      const updateData: any = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }
      
      // Transition to SCANNING if images are being uploaded
      if (body.leftFootImages || body.rightFootImages) {
        updateData.status = 'SCANNING';
      }
      
      const updatedScan = await prisma.footScan.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });
      
      return NextResponse.json(updatedScan);
    }
    
    // Staff can update all fields
    const {
      status,
      scanUrl,
      scanPath,
      previewUrl,
      previewPath,
      leftFootImages,
      rightFootImages,
      captureMetadata,
      biomechanicData,
      pressureMapUrl,
      pressureMapPath,
      archType,
      pronation,
      leftFootLength,
      rightFootLength,
      leftFootWidth,
      rightFootWidth,
      leftArchHeight,
      rightArchHeight,
      gaitAnalysis,
      strideLength,
      cadence,
      clinicianNotes,
      aiRecommendation,
      insoleType,
      insoleSize,
      productionNotes
    } = body;
    
    const updatedScan = await prisma.footScan.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(scanUrl !== undefined && { scanUrl }),
        ...(scanPath !== undefined && { scanPath }),
        ...(previewUrl !== undefined && { previewUrl }),
        ...(previewPath !== undefined && { previewPath }),
        ...(leftFootImages !== undefined && { leftFootImages }),
        ...(rightFootImages !== undefined && { rightFootImages }),
        ...(captureMetadata !== undefined && { captureMetadata }),
        ...(biomechanicData !== undefined && { biomechanicData }),
        ...(pressureMapUrl !== undefined && { pressureMapUrl }),
        ...(pressureMapPath !== undefined && { pressureMapPath }),
        ...(archType !== undefined && { archType }),
        ...(pronation !== undefined && { pronation }),
        ...(leftFootLength !== undefined && { leftFootLength }),
        ...(rightFootLength !== undefined && { rightFootLength }),
        ...(leftFootWidth !== undefined && { leftFootWidth }),
        ...(rightFootWidth !== undefined && { rightFootWidth }),
        ...(leftArchHeight !== undefined && { leftArchHeight }),
        ...(rightArchHeight !== undefined && { rightArchHeight }),
        ...(gaitAnalysis !== undefined && { gaitAnalysis }),
        ...(strideLength !== undefined && { strideLength }),
        ...(cadence !== undefined && { cadence }),
        ...(clinicianNotes !== undefined && { clinicianNotes }),
        ...(aiRecommendation !== undefined && { aiRecommendation }),
        ...(insoleType !== undefined && { insoleType }),
        ...(insoleSize !== undefined && { insoleSize }),
        ...(productionNotes !== undefined && { productionNotes })
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        order: true
      }
    });
    
    return NextResponse.json(updatedScan);
    
  } catch (error) {
    console.error('Error updating foot scan:', error);
    return NextResponse.json({ error: 'Failed to update foot scan' }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE - Delete foot scan
export async function DELETE(
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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Patients cannot delete scans' }, { status: 403 });
    }
    
    const footScan = await prisma.footScan.findUnique({
      where: { id }
    });
    
    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    if (user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Delete associated files from S3
    if (footScan.scanPath) {
      try { await deleteFile(footScan.scanPath); } catch (e) { console.error('Error deleting scan file:', e); }
    }
    if (footScan.previewPath) {
      try { await deleteFile(footScan.previewPath); } catch (e) { console.error('Error deleting preview:', e); }
    }
    if (footScan.pressureMapPath) {
      try { await deleteFile(footScan.pressureMapPath); } catch (e) { console.error('Error deleting pressure map:', e); }
    }
    
    await prisma.footScan.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting foot scan:', error);
    return NextResponse.json({ error: 'Failed to delete foot scan' }, { status: 500 });
  }
}
