/**
 * API base URL. Defaults to production; override in dev/test via the
 * EXPO_PUBLIC_API_URL env var (e.g. http://localhost:3000).
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") || "https://bpr.rehab";
