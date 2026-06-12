import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const STAFF_ROLES = ["ADMIN", "SUPERADMIN", "THERAPIST"];

/**
 * Resolve the current staff user's DB id. Returns null if not authenticated
 * or not a staff member. Falls back to email lookup when the JWT id is stale.
 */
export async function getStudyUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (!STAFF_ROLES.includes(role)) return null;

  let userId = (session.user as any).id as string | undefined;
  const email = session.user.email || undefined;

  if (userId) {
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (exists) return exists.id;
  }
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }
  return null;
}

/** Verify the project exists and belongs to the user. Returns true/false. */
export async function ownsProject(projectId: string, userId: string): Promise<boolean> {
  const p = await prisma.studyProject.findFirst({ where: { id: projectId, ownerId: userId }, select: { id: true } });
  return !!p;
}
