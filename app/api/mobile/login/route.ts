export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { validateCredentials } from "@/lib/auth-credentials";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-tokens";
import { withAbsoluteLogo } from "@/lib/mobile-user";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { canUsePatientApp, patientOnlyRefusal } from "@/lib/mobile-patient-only";

export function OPTIONS() {
  return corsPreflight();
}

// POST: Mobile login with email/password. Returns access + refresh tokens.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {
      return corsJson(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    let user;
    try {
      user = await validateCredentials(email, password, ip);
    } catch (err: any) {
      return corsJson(
        { error: err?.message || "Invalid email or password" },
        { status: 401 }
      );
    }

    // O app é do paciente. Uma conta da clínica entrava, via a lista de
    // módulos, e então cada tela recusava com 403 sem nenhuma saída — a
    // credencial estava certa, o lugar é que era errado. Recusar aqui diz
    // isso, em vez de deixar a pessoa descobrir tela por tela.
    if (!canUsePatientApp(user.role)) {
      return corsJson(patientOnlyRefusal(), { status: 403 });
    }

    const accessToken = signAccessToken(user);

    let refreshToken: string | null = null;
    try {
      refreshToken = await issueRefreshToken(
        user.id,
        request.headers.get("user-agent") || undefined
      );
    } catch {
      // mobile_refresh_tokens table may not exist yet — login still works
      // with access token only; refresh will fail gracefully on the client.
    }

    return corsJson({ accessToken, refreshToken, user: withAbsoluteLogo(user) });
  } catch (error: any) {
    console.error("[AUTH/mobile/login] error:", error?.message);
    return corsJson(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
