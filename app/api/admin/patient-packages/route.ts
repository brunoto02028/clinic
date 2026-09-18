// BPR's platform-wide pricing hub: global service prices and packages created on
// the platform Stripe account. A tenant's ADMIN must not touch them — a studio
// charges through its own Connect account (activity 52, T-2).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSuperadminActor } from '@/lib/tenant-access';

export const dynamic = 'force-dynamic';

// GET — list patient packages (optionally filtered by patientId)
export async function GET(req: NextRequest) {
  if (!(await getSuperadminActor(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');

  const where: any = {};
  if (patientId) where.patientId = patientId;

  const packages = await prisma.patientPackage.findMany({
    where,
    include: {
      package: true,
      patient: { select: { id: true, firstName: true, lastName: true, email: true } },
      grantedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(packages);
}

// POST — assign a package to a patient (admin grants it)
export async function POST(req: NextRequest) {
  const superadmin = await getSuperadminActor(req);
  if (!superadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { patientId, packageId, paid, amountPaid } = await req.json();

  if (!patientId || !packageId) {
    return NextResponse.json({ error: 'patientId and packageId are required' }, { status: 400 });
  }

  // Get the package details
  const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId } });
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const startDate = new Date();
  const endDate = pkg.durationDays ? new Date(Date.now() + pkg.durationDays * 86400000) : null;

  // Create the patient package
  const patientPackage = await prisma.patientPackage.create({
    data: {
      patientId,
      packageId,
      status: 'ACTIVE',
      grantedById: superadmin.userId,
      paid: paid === true,
      amountPaid: amountPaid ? parseFloat(amountPaid) : (paid ? pkg.price : null),
      currency: pkg.currency,
      startDate,
      endDate,
    },
    include: { package: true },
  });

  // Auto-grant service access for all included services
  for (const serviceType of pkg.includedServices) {
    const existing = await (prisma as any).serviceAccess.findFirst({
      where: { patientId, serviceType },
    });
    if (existing) {
      await (prisma as any).serviceAccess.update({
        where: { id: existing.id },
        data: { granted: true, grantedById: superadmin.userId },
      });
    } else {
      await (prisma as any).serviceAccess.create({
        data: {
          patientId,
          serviceType,
          granted: true,
          grantedById: superadmin.userId,
        },
      });
    }
  }

  return NextResponse.json(patientPackage);
}

// DELETE — revoke a patient package
export async function DELETE(req: NextRequest) {
  if (!(await getSuperadminActor(req))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'PatientPackage ID required' }, { status: 400 });

  // Get the package details before deleting
  const pp = await prisma.patientPackage.findUnique({
    where: { id },
    include: { package: true },
  });
  if (!pp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.patientPackage.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return NextResponse.json({ success: true });
}
