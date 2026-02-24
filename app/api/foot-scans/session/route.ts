import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

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

// POST - Create scan session with token (staff only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });

    if (!user || !user.clinicId) {
      return NextResponse.json({ error: 'User or clinic not found' }, { status: 404 });
    }

    // Only staff can create scan sessions
    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Only staff can create scan sessions' }, { status: 403 });
    }

    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    // Verify patient exists
    const patient = await prisma.user.findFirst({
      where: { id: patientId, clinicId: user.clinicId, role: 'PATIENT' }
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found in clinic' }, { status: 404 });
    }

    // Generate unique token and scan number
    const scanToken = crypto.randomBytes(16).toString('hex');
    const scanNumber = await generateScanNumber();
    const scanTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const footScan = await prisma.footScan.create({
      data: {
        scanNumber,
        clinicId: user.clinicId,
        patientId,
        scanToken,
        scanTokenExpiry,
        status: 'PENDING_UPLOAD',
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    const baseUrl = request.headers.get('origin') || request.headers.get('host') || '';
    const protocol = baseUrl.startsWith('http') ? '' : 'https://';
    const scanUrl = `${protocol}${baseUrl}/scan/${scanToken}`;

    return NextResponse.json({
      footScan,
      scanToken,
      scanUrl,
      expiresAt: scanTokenExpiry.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating scan session:', error);
    return NextResponse.json({ error: 'Failed to create scan session' }, { status: 500 });
  }
}

// GET - Validate a scan token (public - used by mobile capture page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const footScan = await prisma.footScan.findUnique({
      where: { scanToken: token },
      include: {
        patient: {
          select: { firstName: true, lastName: true }
        },
        clinic: {
          select: { name: true, logoUrl: true }
        }
      }
    });

    if (!footScan) {
      return NextResponse.json({ error: 'Invalid scan token' }, { status: 404 });
    }

    // Check expiry
    if (footScan.scanTokenExpiry && new Date() > footScan.scanTokenExpiry) {
      return NextResponse.json({ error: 'Scan token expired' }, { status: 410 });
    }

    // Check if already completed
    if (footScan.status !== 'PENDING_UPLOAD' && footScan.status !== 'SCANNING') {
      return NextResponse.json({ error: 'Scan already completed', status: footScan.status }, { status: 409 });
    }

    return NextResponse.json({
      id: footScan.id,
      scanNumber: footScan.scanNumber,
      patientName: `${footScan.patient.firstName} ${footScan.patient.lastName}`,
      clinicName: footScan.clinic.name,
      clinicLogo: footScan.clinic.logoUrl,
      status: footScan.status,
      hasLidarHint: true, // Flag to enable LiDAR detection on the client
    });

  } catch (error) {
    console.error('Error validating scan token:', error);
    return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 });
  }
}
