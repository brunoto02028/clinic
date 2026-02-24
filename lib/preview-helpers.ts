import { NextRequest } from "next/server";

/**
 * When an admin/therapist is previewing the patient portal,
 * the client-side fetch interceptor appends `?_pid=<patientId>` to API calls.
 * This helper returns the effective patient ID to use for data queries.
 *
 * Returns the `_pid` value if present AND the session user is staff,
 * otherwise returns the session user's own ID.
 */
export function getEffectiveUserId(
  session: any,
  request: NextRequest
): string {
  const userId = (session?.user as any)?.id;
  const role = (session?.user as any)?.role;
  const previewPid = request.nextUrl.searchParams.get("_pid");

  if (
    previewPid &&
    (role === "ADMIN" || role === "SUPERADMIN" || role === "THERAPIST")
  ) {
    return previewPid;
  }

  return userId;
}

/**
 * Check if the current request is a preview impersonation.
 */
export function isPreviewRequest(session: any, request: NextRequest): boolean {
  const role = (session?.user as any)?.role;
  const previewPid = request.nextUrl.searchParams.get("_pid");
  return !!(
    previewPid &&
    (role === "ADMIN" || role === "SUPERADMIN" || role === "THERAPIST")
  );
}
