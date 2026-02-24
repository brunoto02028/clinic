export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';

// GET — patient profile
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const userId = effectiveUser.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, dateOfBirth: true, address: true,
        preferredLocale: true, communicationPreference: true,
        emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
      } as any,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('[patient-profile] GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PATCH — update patient profile fields
export async function PATCH(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    // Block writes during impersonation (read-only)
    if (effectiveUser.isImpersonating) {
      return NextResponse.json({ error: 'Cannot modify profile while impersonating' }, { status: 403 });
    }

    const userId = effectiveUser.userId;
    const body = await req.json();

    const allowedFields = ['phone', 'address', 'preferredLocale', 'communicationPreference', 'dateOfBirth', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation'];
    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    // Convert dateOfBirth string to DateTime
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      data.dateOfBirth = new Date(data.dateOfBirth);
    } else if (data.dateOfBirth === null) {
      data.dateOfBirth = null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const user = await (prisma as any).user.update({
      where: { id: userId },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferredLocale: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[patient-profile] PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
