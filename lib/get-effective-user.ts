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

  const headerList = headers();
  const headerUserId = headerList.get("x-user-id");
  const headerRole = headerList.get("x-user-role");
  const impersonatedBy = headerList.get("x-impersonated-by");

  // If middleware set impersonation headers
  if (impersonatedBy && headerUserId && headerUserId !== realUserId) {
    return {
      userId: headerUserId,
      role: headerRole || "PATIENT",
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
