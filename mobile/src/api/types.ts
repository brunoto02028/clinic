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
  /** CLINIC ou PERSONAL_TRAINER. Já vinha no token e na resposta do cadastro;
   *  faltava declarar. É o que distingue um paciente de clínica, que faz
   *  avaliação clínica, de um aluno de estúdio, para quem essa rota é
   *  bloqueada. */
  clinicType: string | null;
  permissions: Record<string, boolean>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}
