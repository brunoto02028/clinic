export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { revokeRefreshToken } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

// POST: Revoke a refresh token (logout). Idempotent.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const presented = body?.refreshToken;

    if (presented) {
      await revokeRefreshToken(presented);
    }

    return corsJson({ success: true });
  } catch (error: any) {
    console.error("[AUTH/mobile/logout] error:", error?.message);
    return corsJson(
      { error: "Service temporarily unavailable" },
      { status: 500 }
    );
  }
}
