export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { getValidatedUserById } from "@/lib/auth-credentials";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

// GET: Returns the authenticated patient's profile. Bearer-token protected.
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const user = await getValidatedUserById(payload.sub);
  if (!user) {
    return corsJson({ error: "Account is no longer active" }, { status: 401 });
  }

  return corsJson({ user });
}
