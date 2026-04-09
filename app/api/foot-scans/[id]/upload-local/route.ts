import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const VIEW_MAP: Record<string, string> = {
  top: 'PLANTAR_OUTLINE',
  plantar: 'PLANTAR_OUTLINE',
  sole: 'TRUE_PLANTAR',
  medial: 'MEDIAL',
  lateral: 'LATERAL',
  front: 'ANTERIOR',
  anterior: 'ANTERIOR',
  rear: 'POSTERIOR',
  posterior: 'POSTERIOR',
  dorsal: 'DORSAL',
  shoe: 'SHOE_SOLE',
};

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
    const scanToken = formData.get('scanToken') as string | null;

    if (!file || !angle || !foot) {
      return NextResponse.json(
        { error: 'file, angle, and foot are required' },
        { status: 400 }
      );
    }

    let footScan: any;

    if (scanToken) {
      // Token-based auth (patient mobile scan link)
      footScan = await (prisma.footScan as any).findUnique({
        where: { scanToken },
      });

      if (!footScan || footScan.id !== id) {
        return NextResponse.json({ error: 'Invalid scan token or ID' }, { status: 403 });
      }

      if (footScan.scanTokenExpiry && new Date() > new Date(footScan.scanTokenExpiry)) {
        return NextResponse.json({ error: 'Scan token expired' }, { status: 410 });
      }
    } else {
      // Session-based auth (patient dashboard or staff)
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userId = (session.user as any).id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      footScan = await (prisma.footScan as any).findUnique({ where: { id } });

      if (!footScan) {
        return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
      }

      // Patients can only upload to their own scans
      if (user.role === 'PATIENT' && footScan.patientId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
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

    // Create directory structure — use Railway Volume (UPLOADS_DIR) or local public folder
    const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const uploadDir = path.join(uploadsBase, 'scans', footScan.scanNumber);
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
      workflowStatus: 'CAPTURE_IN_PROGRESS',
    };

    if (foot === 'left') {
      updateData.leftFootImages = updatedImages;
    } else {
      updateData.rightFootImages = updatedImages;
    }

    const isFirstImage = currentImages.length === 0;

    const updatedFootScan = await prisma.footScan.update({
      where: { id },
      data: updateData,
    });

    const currentSessionId = updatedFootScan.currentSessionId;
    if (currentSessionId) {
      const mappedView = VIEW_MAP[String(angle).toLowerCase()] || 'PLANTAR_OUTLINE';
      await (prisma as any).footScanCapture.create({
        data: {
          footScanId: id,
          footScanSessionId: currentSessionId,
          side: foot === 'left' ? 'LEFT' : 'RIGHT',
          view: mappedView,
          captureRole: 'REQUIRED',
          sequenceNo: updatedImages.length,
          status: 'UPLOADED',
          storageUrl: imageUrl,
          storagePath: filePath,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date(),
          deviceMetadata: {
            uploadSource: 'upload-local',
            originalFileName: file.name,
            legacyAngle: angle,
            legacyFoot: foot,
          },
          qualityScores: null,
          approvedForAnalysis: false,
        }
      }).catch((captureErr: any) => {
        console.error('[foot-scan] Failed to dual-write capture:', captureErr);
      });

      await (prisma as any).footScanSession.update({
        where: { id: currentSessionId },
        data: {
          sessionStatus: 'IN_PROGRESS',
          startedAt: new Date(),
        }
      }).catch(() => null);

      await (prisma as any).footScanEvent.create({
        data: {
          footScanId: id,
          sessionId: currentSessionId,
          eventType: 'CAPTURE_UPLOADED',
          actorType: 'PATIENT',
          payload: {
            imageUrl,
            foot,
            angle,
            mappedView,
          }
        }
      }).catch(() => null);
    }

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
              portalUrl: `${process.env.NEXTAUTH_URL || ''}/dashboard/scans`,
            },
            plainMessage: 'Your foot scan images have been uploaded successfully. Our team will analyse them shortly.',
            plainMessagePt: 'Suas imagens de escaneamento do pé foram enviadas com sucesso. Nossa equipe irá analisá-las em breve.',
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
