import { NextRequest } from "next/server";
import { verifyAccessToken, type AccessTokenPayload } from "@/lib/mobile-tokens";

/** Extracts a Bearer token from the Authorization header, or null. */
export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

/**
 * Verifies the mobile access token on a request. Returns the decoded payload,
 * or null if the token is missing/invalid/expired. Use to guard mobile APIs.
 */
export function getMobileUser(request: NextRequest): AccessTokenPayload | null {
  const token = getBearerToken(request);
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
