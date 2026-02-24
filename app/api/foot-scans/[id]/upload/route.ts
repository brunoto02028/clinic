import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generatePresignedUploadUrl, getFileUrl } from '@/lib/s3';

// POST - Generate presigned URL for upload
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
    const body = await request.json();
    const { fileName, fileType, uploadType } = body; // uploadType: 'scan' | 'preview' | 'leftFoot' | 'rightFoot'
    
    if (!fileName || !fileType || !uploadType) {
      return NextResponse.json({ error: 'fileName, fileType, and uploadType required' }, { status: 400 });
    }
    
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const footScan = await prisma.footScan.findUnique({
      where: { id }
    });
    
    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    // Check access
    if (user.role === 'PATIENT' && footScan.patientId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Generate presigned URL (private upload)
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      `foot-scans/${footScan.scanNumber}/${uploadType}/${fileName}`,
      fileType,
      false // private file
    );
    
    return NextResponse.json({
      uploadUrl,
      cloud_storage_path,
      uploadType
    });
    
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
