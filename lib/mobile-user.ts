import { absoluteLogoUrl } from "@/lib/auth-credentials";

// The user object the app receives. Only the logo differs from the web
// session's: the app needs an absolute URL (activity 52, T-3).
export function withAbsoluteLogo<T extends { clinicLogoUrl?: string | null }>(user: T): T {
  return { ...user, clinicLogoUrl: absoluteLogoUrl(user.clinicLogoUrl) };
}
