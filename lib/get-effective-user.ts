import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers } from "next/headers";

/**
 * Returns the effective user ID and role, accounting for admin impersonation.
 * When an admin is impersonating a patient, middleware sets x-user-id to the
 * patient's ID and x-user-role to PATIENT for non-admin API routes.
 */
export async function getEffectiveUser(): Promise<{
  userId: string;
  role: string;
  isImpersonating: boolean;
  realAdminId?: string;
} | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const realUserId = (session.user as any).id;
  const realRole = (session.user as any).role;

  // Guard: if session has no user ID, treat as unauthenticated
  if (!realUserId) return null;

  const headerList = headers();
  const headerUserId = headerList.get("x-user-id");
  const headerRole = headerList.get("x-user-role");
  const impersonatedBy = headerList.get("x-impersonated-by");

  // Validate header values before trusting them
  const validIdFormat = /^[a-zA-Z0-9_-]{10,50}$/;
  const validRoles = ["PATIENT", "ADMIN", "THERAPIST", "SUPERADMIN"];

  // If middleware set impersonation headers
  if (
    impersonatedBy &&
    headerUserId &&
    headerUserId !== realUserId &&
    validIdFormat.test(headerUserId) &&
    validIdFormat.test(impersonatedBy)
  ) {
    const safeRole = (headerRole && validRoles.includes(headerRole)) ? headerRole : "PATIENT";
    return {
      userId: headerUserId,
      role: safeRole,
      isImpersonating: true,
      realAdminId: impersonatedBy,
    };
  }

  return {
    userId: realUserId,
    role: realRole,
    isImpersonating: false,
  };
}
