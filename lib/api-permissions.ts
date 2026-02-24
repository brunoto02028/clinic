import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export type PermissionKey =
  | "canManageUsers"
  | "canManageAppointments"
  | "canManageArticles"
  | "canManageSettings"
  | "canViewAllPatients"
  | "canCreateClinicalNotes"
  | "canManageFootScans"
  | "canManageOrders";

/**
 * Check if the current user has the required permission.
 * SUPERADMIN and ADMIN always pass. THERAPIST checked against permissions.
 * Returns null if authorized, or a NextResponse 403 if not.
 */
export async function requirePermission(
  request: NextRequest,
  permission: PermissionKey
): Promise<NextResponse | null> {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = token.role as string;

  // SUPERADMIN and ADMIN bypass permission checks
  if (role === "SUPERADMIN" || role === "ADMIN") {
    return null;
  }

  // PATIENT should never reach admin APIs
  if (role === "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // THERAPIST — check specific permission
  const permissions = token.permissions as Record<string, boolean> | undefined;
  if (!permissions?.[permission]) {
    return NextResponse.json(
      { error: "You do not have permission to perform this action" },
      { status: 403 }
    );
  }

  return null; // Authorized
}

/**
 * Get the authenticated user info from the JWT token.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return null;

  return {
    id: token.id as string,
    email: token.email as string,
    role: token.role as string,
    clinicId: token.clinicId as string | null,
    permissions: (token.permissions as Record<string, boolean>) || {},
  };
}
