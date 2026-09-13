import { prisma } from "@/lib/db";

// Per-tenant seat limits (activity 38 T-3). `Subscription.maxPatients`/
// `maxTherapists` already existed in the schema with no UI and no
// enforcement — most clinics have no Subscription row at all yet, which is
// exactly "no limit configured" (today's behaviour, unchanged). A row's own
// value of 0 is the same thing: the UI's "no limit" state, not a hard cap of
// zero seats.
//
// Only gates creating a NEW account — never touches who already exists, even
// above a limit lowered after the fact.

export interface LimitCheck {
  allowed: boolean;
  message?: string;
}

export async function checkPatientLimit(clinicId: string | null): Promise<LimitCheck> {
  if (!clinicId) return { allowed: true };
  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
    select: { maxPatients: true },
  });
  const limit = subscription?.maxPatients;
  if (!limit || limit <= 0) return { allowed: true };

  const count = await prisma.user.count({ where: { clinicId, role: "PATIENT" } });
  if (count >= limit) {
    return { allowed: false, message: "This account has reached its plan's patient limit. Contact the platform administrator to increase it." };
  }
  return { allowed: true };
}

export async function checkTherapistLimit(clinicId: string | null): Promise<LimitCheck> {
  if (!clinicId) return { allowed: true };
  const subscription = await prisma.subscription.findUnique({
    where: { clinicId },
    select: { maxTherapists: true },
  });
  const limit = subscription?.maxTherapists;
  if (!limit || limit <= 0) return { allowed: true };

  const count = await prisma.user.count({ where: { clinicId, role: { in: ["ADMIN", "THERAPIST"] } } });
  if (count >= limit) {
    return { allowed: false, message: "This account has reached its plan's staff limit. Contact the platform administrator to increase it." };
  }
  return { allowed: true };
}
