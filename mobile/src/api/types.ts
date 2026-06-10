/** Mirrors the payload returned by /api/auth/mobile/* on the backend. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  firstName: string;
  lastName: string;
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  permissions: Record<string, boolean>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}
