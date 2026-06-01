import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { InsoleMeshGenerator } from '@/lib/insoles/generators/mesh-generator';
import { GeometryValidator } from '@/lib/insoles/validators/geometry-validator';
import { STLExporter } from '@/lib/insoles/exporters/stl-exporter';
import { InsoleSpecCalculator } from '@/lib/insoles/spec-calculator';

export const dynamic = 'force-dynamic';

// POST - Generate insole STL files
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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Only staff can generate insoles
    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Only staff can generate insoles' }, { status: 403 });
    }
    
    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true 
          }
        }
      }
    });
    
    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    if (user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check if analysis has been done
    if (!footScan.archType || !footScan.pronation) {
      return NextResponse.json({ 
        error: 'Analysis required before generating insoles. Please run AI analysis first.' 
      }, { status: 400 });
    }
    
    // Parse AI recommendations
    const recommendations = footScan.aiRecommendation ? JSON.parse(footScan.aiRecommendation as string) : null;
    
    if (!recommendations) {
      return NextResponse.json({ 
        error: 'AI recommendations not found. Please run analysis first.' 
      }, { status: 400 });
    }
    
    console.log('[Insoles] Calculating specifications...');
    
    // Calculate specifications for both feet
    const leftSpec = InsoleSpecCalculator.calculate({
      id: footScan.id,
      side: 'left',
      footLength: footScan.leftFootLength || 260,
      footWidth: footScan.leftFootWidth || 100,
      archType: footScan.archType,
      archIndex: footScan.archIndex,
      pronation: footScan.pronation,
      calcanealAlignment: footScan.calcanealAlignment,
      halluxValgusAngle: footScan.halluxValgusAngle,
      metatarsalSpread: footScan.metatarsalSpread,
      navicularHeight: footScan.navicularHeight,
    });
    
    const rightSpec = InsoleSpecCalculator.calculate({
      id: footScan.id,
      side: 'right',
      footLength: footScan.rightFootLength || 260,
      footWidth: footScan.rightFootWidth || 100,
      archType: footScan.archType,
      archIndex: footScan.archIndex,
      pronation: footScan.pronation,
      calcanealAlignment: footScan.calcanealAlignment,
      halluxValgusAngle: footScan.halluxValgusAngle,
      metatarsalSpread: footScan.metatarsalSpread,
      navicularHeight: footScan.navicularHeight,
    });
    
    console.log('[Insoles] Generating left insole mesh...');
    
    // Generate LEFT insole
    const leftGenerator = new InsoleMeshGenerator(leftSpec);
    const leftGeometry = leftGenerator.generate();
    
    // Validate left geometry
    const leftValidation = GeometryValidator.validate(leftGeometry);
    if (!leftValidation.valid) {
      return NextResponse.json({
        error: 'Left insole geometry validation failed',
        errors: leftValidation.errors,
        warnings: leftValidation.warnings,
      }, { status: 400 });
    }
    
    // Export left STL
    const leftFilename = `${footScan.scanNumber}-left-insole.stl`;
    const leftInsoleUrl = await STLExporter.saveToFile(leftGeometry, leftFilename);
    
    console.log('[Insoles] Generating right insole mesh...');
    
    // Generate RIGHT insole
    const rightGenerator = new InsoleMeshGenerator(rightSpec);
    const rightGeometry = rightGenerator.generate();
    
    // Validate right geometry
    const rightValidation = GeometryValidator.validate(rightGeometry);
    if (!rightValidation.valid) {
      return NextResponse.json({
        error: 'Right insole geometry validation failed',
        errors: rightValidation.errors,
        warnings: rightValidation.warnings,
      }, { status: 400 });
    }
    
    // Export right STL
    const rightFilename = `${footScan.scanNumber}-right-insole.stl`;
    const rightInsoleUrl = await STLExporter.saveToFile(rightGeometry, rightFilename);
    
    console.log('[Insoles] ✓ Both insoles generated successfully');
    
    // Combine specs for storage
    const insoleSpecs = {
      left: leftSpec,
      right: rightSpec,
      validation: {
        left: leftValidation,
        right: rightValidation,
      },
    };
    
    // Update foot scan with insole generation status
    await prisma.footScan.update({
      where: { id },
      data: {
        workflowStatus: 'APPROVED_FOR_PRODUCTION',
        manufacturingStatus: 'READY',
        insoleSpecs: insoleSpecs as any,
      }
    });
    
    // Create event log
    try {
      await (prisma as any).footScanEvent.create({
        data: {
          footScanId: id,
          eventType: 'INSOLES_GENERATED',
          actorType: 'STAFF',
          actorId: userId,
          payload: {
            insoleSpecs,
            leftInsoleUrl,
            rightInsoleUrl,
          }
        }
      });
    } catch (err) {
      console.warn('Failed to create event log:', err);
    }
    
    return NextResponse.json({
      success: true,
      leftInsoleUrl,
      rightInsoleUrl,
      insoleSpecs,
      message: 'Insole models generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating insoles:', error);
    return NextResponse.json({ error: 'Failed to generate insoles' }, { status: 500 });
  }
}
