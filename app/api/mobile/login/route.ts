export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { validateCredentials } from "@/lib/auth-credentials";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

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

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(
      user.id,
      request.headers.get("user-agent") || undefined
    );

    return corsJson({ accessToken, refreshToken, user });
  } catch (error: any) {
    console.error("[AUTH/mobile/login] error:", error?.message);
    return corsJson(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
