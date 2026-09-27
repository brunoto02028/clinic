import type { DefaultSession } from "next-auth";

/**
 * O que a nossa sessão realmente carrega.
 *
 * O `session` callback (`lib/auth-options.ts`) escreve doze campos em
 * `session.user` — id, role, clínica, permissões — e escreve **todos** por
 * `(session.user as any)`, porque sem esta declaração o tipo do NextAuth só tem
 * `name`, `email` e `image`.
 *
 * O preço disso aparecia nos consumidores: quem lia `session.user.role` sem
 * repetir o `as any` recebia *"Property 'role' does not exist"* — e o
 * `npm run build` não reclamava, porque o Next está configurado para ignorar
 * erro de tipo. Ou seja, o campo mais usado em toda decisão de permissão do
 * sistema era invisível para o compilador.
 *
 * Declarar aqui não muda comportamento nenhum: só para de esconder de quem lê o
 * código o que a sessão de fato tem.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      firstName?: string | null;
      lastName?: string | null;
      clinicId?: string | null;
      clinicName?: string | null;
      clinicSlug?: string | null;
      clinicType?: string | null;
      clinicLogoUrl?: string | null;
      clinicPrimaryColor?: string | null;
      /** O tenant que um SUPERADMIN está olhando (atividade 57). */
      viewClinicId?: string | null;
      instagramImportEnabled?: boolean | null;
      permissions?: unknown;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    clinicSlug?: string | null;
    clinicType?: string | null;
    clinicLogoUrl?: string | null;
    clinicPrimaryColor?: string | null;
    viewClinicId?: string | null;
    instagramImportEnabled?: boolean | null;
    permissions?: unknown;
  }
}
