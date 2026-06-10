export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getValidatedUserById } from "@/lib/auth-credentials";
import { signAccessToken, rotateRefreshToken } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

// POST: Exchange a valid refresh token for a new access + refresh pair (rotation).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const presented = body?.refreshToken;

    if (!presented) {
      return corsJson({ error: "refreshToken is required" }, { status: 400 });
    }

    const rotated = await rotateRefreshToken(
      presented,
      request.headers.get("user-agent") || undefined
    );

    if (!rotated) {
      return corsJson(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    const user = await getValidatedUserById(rotated.userId);
    if (!user) {
      return corsJson({ error: "Account is no longer active" }, { status: 401 });
    }

    const accessToken = signAccessToken(user);
    return corsJson({
      accessToken,
      refreshToken: rotated.refreshToken,
      user,
    });
  } catch (error: any) {
    console.error("[AUTH/mobile/refresh] error:", error?.message);
    return corsJson(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
