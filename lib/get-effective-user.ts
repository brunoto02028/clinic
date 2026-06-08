import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { headers } from "next/headers";
import { verifyAccessToken } from "@/lib/mobile-tokens";

/** Resolves a mobile bearer token from the current request headers, or null. */
function getBearerIdentity(
  headerList: ReturnType<typeof headers>
): { userId: string; role: string } | null {
  const auth = headerList.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  try {
    const payload = verifyAccessToken(token);
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

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
  const headerList = headers();

  // Web (cookie session) takes precedence; fall back to mobile bearer token.
  let realUserId = (session?.user as any)?.id as string | undefined;
  let realRole = (session?.user as any)?.role as string | undefined;
  if (!realUserId) {
    const bearer = getBearerIdentity(headerList);
    if (!bearer) return null;
    realUserId = bearer.userId;
    realRole = bearer.role;
  }

  // Guard: if neither auth yielded a valid identity, treat as unauthenticated.
  // Don't mask a missing role with a default — deny instead.
  if (!realUserId || !realRole) return null;
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
