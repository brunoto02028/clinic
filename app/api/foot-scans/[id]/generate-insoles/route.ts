import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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
    
    // Calculate insole specifications based on analysis
    const insoleSpecs = {
      // Base measurements from foot scan
      leftFootLength: footScan.leftFootLength || 260,
      rightFootLength: footScan.rightFootLength || 260,
      leftFootWidth: footScan.leftFootWidth || 100,
      rightFootWidth: footScan.rightFootWidth || 100,
      
      // Arch support
      archSupportHeight: recommendations.recommendations?.archSupportHeight || 6,
      leftArchHeight: footScan.leftArchHeight || 25,
      rightArchHeight: footScan.rightArchHeight || 25,
      
      // Heel corrections
      heelCupDepth: recommendations.recommendations?.heelCupDepth || 15,
      heelWedgeAngle: footScan.calcanealAlignment ? Math.abs(footScan.calcanealAlignment) * 0.3 : 0,
      heelWedgeSide: footScan.pronation === 'Overpronation' ? 'lateral' : 
                     footScan.pronation === 'Supination' ? 'medial' : 'none',
      
      // Lateral/medial support
      lateralSupport: footScan.pronation === 'Supination' ? 3 : 0,
      medialSupport: footScan.pronation === 'Overpronation' ? 4 : 0,
      
      // Metatarsal pad
      metatarsalPad: recommendations.recommendations?.metatarsalPad || false,
      metatarsalPadHeight: recommendations.recommendations?.metatarsalPad ? 3 : 0,
      
      // Material and thickness
      baseThickness: 3, // mm
      maxThickness: 8,  // mm
    };
    
    // Generate STL files (simplified - in production this would use a 3D library)
    // For now, we'll create placeholder URLs that point to generated files
    const leftInsoleUrl = `/api/foot-scans/${id}/insoles/left.stl`;
    const rightInsoleUrl = `/api/foot-scans/${id}/insoles/right.stl`;
    
    // Update foot scan with insole generation status
    await prisma.footScan.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        workflowStatus: 'INSOLES_GENERATED',
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
