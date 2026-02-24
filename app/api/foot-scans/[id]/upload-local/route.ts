import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST - Upload scan image to local storage (public — accessed via scan token)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const angle = formData.get('angle') as string;
    const foot = formData.get('foot') as string; // 'left' or 'right'
    const scanToken = formData.get('scanToken') as string;

    if (!file || !angle || !foot || !scanToken) {
      return NextResponse.json(
        { error: 'file, angle, foot, and scanToken are required' },
        { status: 400 }
      );
    }

    // Validate scan by token
    const footScan = await (prisma.footScan as any).findUnique({
      where: { scanToken },
    });

    if (!footScan || footScan.id !== id) {
      return NextResponse.json({ error: 'Invalid scan token or ID' }, { status: 403 });
    }

    // Check token expiry
    if (footScan.scanTokenExpiry && new Date() > new Date(footScan.scanTokenExpiry)) {
      return NextResponse.json({ error: 'Scan token expired' }, { status: 410 });
    }

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    // Create directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'scans', footScan.scanNumber);
    await mkdir(uploadDir, { recursive: true });

    // Generate filename
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${foot}-${angle}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(bytes));

    // Public URL
    const imageUrl = `/uploads/scans/${footScan.scanNumber}/${fileName}`;

    // Update the footScan record — append image URL to the correct array
    const currentImages = (foot === 'left'
      ? (footScan.leftFootImages as string[] | null)
      : (footScan.rightFootImages as string[] | null)) || [];

    const updatedImages = [...currentImages, imageUrl];

    const updateData: any = {
      status: 'SCANNING',
    };

    if (foot === 'left') {
      updateData.leftFootImages = updatedImages;
    } else {
      updateData.rightFootImages = updatedImages;
    }

    const isFirstImage = currentImages.length === 0;

    await prisma.footScan.update({
      where: { id },
      data: updateData,
    });

    // Send notification on first image upload (scan session started)
    if (isFirstImage) {
      try {
        const fullScan = await (prisma.footScan as any).findUnique({
          where: { id },
          select: { patientId: true },
        });
        if (fullScan?.patientId) {
          const { notifyPatient } = await import('@/lib/notify-patient');
          await notifyPatient({
            patientId: fullScan.patientId,
            emailTemplateSlug: 'FOOT_SCAN_SUBMITTED',
            emailVars: {
              portalUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard`,
            },
            plainMessage: 'Your foot scan images have been uploaded successfully. Our team will analyse them shortly.',
          });
        }
      } catch (emailErr) {
        console.error('[foot-scan] Failed to send notification:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      foot,
      angle,
      totalImages: updatedImages.length,
    });

  } catch (error) {
    console.error('Error uploading scan image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
