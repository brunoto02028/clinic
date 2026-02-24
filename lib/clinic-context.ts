/**
 * Clinic Context Utilities
 * 
 * Helper functions for multi-tenant data isolation
 */

import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from './db';

export interface ClinicContext {
  clinicId: string | null;
  userId: string | null;
  userRole: string | null;
}

/**
 * Get clinic context from request headers (set by middleware)
 */
export async function getClinicContext(): Promise<ClinicContext> {
  const headersList = headers();
  
  return {
    clinicId: headersList.get('x-clinic-id'),
    userId: headersList.get('x-user-id'),
    userRole: headersList.get('x-user-role'),
  };
}

/**
 * Get clinic context from session (fallback)
 */
export async function getClinicContextFromSession(): Promise<ClinicContext> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return { clinicId: null, userId: null, userRole: null };
  }
  
  return {
    clinicId: (session.user as any).clinicId || null,
    userId: (session.user as any).id || null,
    userRole: (session.user as any).role || null,
  };
}

/**
 * Validate that user belongs to the specified clinic
 */
export async function validateClinicAccess(
  userId: string,
  clinicId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clinicId: true, role: true },
  });
  
  if (!user) return false;
  
  // SUPERADMIN can access any clinic
  if (user.role === 'SUPERADMIN') return true;
  
  return user.clinicId === clinicId;
}

/**
 * Get the default clinic (for single-tenant compatibility)
 */
export async function getDefaultClinic() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  
  return clinic;
}

/**
 * Build Prisma where clause with clinic isolation
 */
export function withClinicFilter<T extends Record<string, any>>(
  where: T,
  clinicId: string | null
): T & { clinicId?: string } {
  if (!clinicId) return where;
  return { ...where, clinicId };
}

/**
 * Generate order number for a clinic
 */
export async function generateOrderNumber(clinicId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = 'BPR'; // Can be customized per clinic
  
  const lastOrder = await prisma.order.findFirst({
    where: {
      clinicId,
      orderNumber: { startsWith: `${prefix}-${year}` },
    },
    orderBy: { orderNumber: 'desc' },
  });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Generate foot scan number
 */
export async function generateScanNumber(clinicId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = 'FS';
  
  const lastScan = await prisma.footScan.findFirst({
    where: {
      clinicId,
      scanNumber: { startsWith: `${prefix}-${year}` },
    },
    orderBy: { scanNumber: 'desc' },
  });
  
  let sequence = 1;
  if (lastScan) {
    const lastSeq = parseInt(lastScan.scanNumber.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}
