import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateFootScanPDF } from '@/lib/foot-scans/pdf-generator';

// GET - Generate comprehensive scan report data or PDF
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format'); // 'json' or 'pdf'
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

    // Only staff can generate reports
    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            medicalScreening: true,
          }
        },
        clinic: {
          select: { name: true, logoUrl: true, email: true, phone: true, address: true }
        }
      }
    });

    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }

    if (user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse AI recommendation
    let aiRecommendation = null;
    try {
      if (footScan.aiRecommendation) {
        aiRecommendation = JSON.parse(footScan.aiRecommendation);
      }
    } catch {}

    // Build comprehensive report
    const report = {
      // Header
      reportId: `RPT-${footScan.scanNumber}`,
      generatedAt: new Date().toISOString(),
      clinic: {
        name: footScan.clinic.name,
        logo: footScan.clinic.logoUrl,
        email: footScan.clinic.email,
        phone: footScan.clinic.phone,
        address: footScan.clinic.address,
      },

      // Patient
      patient: {
        name: `${footScan.patient.firstName} ${footScan.patient.lastName}`,
        email: footScan.patient.email,
        phone: footScan.patient.phone,
      },

      // Scan Info
      scan: {
        number: footScan.scanNumber,
        date: footScan.createdAt,
        status: footScan.status,
        captureMetadata: footScan.captureMetadata,
        leftFootImages: footScan.leftFootImages,
        rightFootImages: footScan.rightFootImages,
      },

      // Primary Indicators
      indicators: {
        archType: footScan.archType,
        archIndex: footScan.archIndex,
        pronation: footScan.pronation,
        calcanealAlignment: footScan.calcanealAlignment,
        halluxValgusAngle: footScan.halluxValgusAngle,
        metatarsalSpread: footScan.metatarsalSpread,
        navicularHeight: footScan.navicularHeight,
      },

      // Standard Measurements
      measurements: {
        leftFootLength: footScan.leftFootLength,
        rightFootLength: footScan.rightFootLength,
        leftFootWidth: footScan.leftFootWidth,
        rightFootWidth: footScan.rightFootWidth,
        leftArchHeight: footScan.leftArchHeight,
        rightArchHeight: footScan.rightArchHeight,
        lengthDifference: footScan.leftFootLength && footScan.rightFootLength
          ? Math.abs(footScan.leftFootLength - footScan.rightFootLength)
          : null,
        widthDifference: footScan.leftFootWidth && footScan.rightFootWidth
          ? Math.abs(footScan.leftFootWidth - footScan.rightFootWidth)
          : null,
      },

      // Dynamic Analysis
      dynamics: {
        gaitAnalysis: footScan.gaitAnalysis,
        strideLength: footScan.strideLength,
        cadence: footScan.cadence,
      },

      // AI Analysis
      biomechanicData: footScan.biomechanicData,
      aiRecommendation,

      // Clinical Notes
      clinicianNotes: footScan.clinicianNotes,

      // Insole Specs
      insole: {
        type: footScan.insoleType,
        size: footScan.insoleSize,
        productionNotes: footScan.productionNotes,
      },

      // Manufacturing
      manufacturingReport: footScan.manufacturingReport
        ? (() => { try { return JSON.parse(footScan.manufacturingReport); } catch { return null; } })()
        : null,
    };

    // Return PDF if requested
    if (format === 'pdf') {
      try {
        const pdfBytes = await generateFootScanPDF(report);
        
        return new NextResponse(pdfBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="foot-scan-${footScan.scanNumber}.pdf"`,
          },
        });
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
      }
    }

    // Return JSON by default
    return NextResponse.json(report);

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
