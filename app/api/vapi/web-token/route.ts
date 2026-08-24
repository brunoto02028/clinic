// app/api/vapi/web-token/route.ts
// GET — returns Vapi public key + assistant ID for the web widget
// This endpoint is intentionally public (no auth required) so the widget
// can initialise without a logged-in session.

import { NextResponse } from "next/server";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

export async function GET() {
  // Read from systemConfig first (so it can be enabled without server-env access,
  // like the AI keys) then env. Both values are public — the widget runs client-side.
  const publicKey = (await getConfigValue("VAPI_PUBLIC_KEY")) || process.env.VAPI_PUBLIC_KEY;
  const assistantId = (await getConfigValue("VAPI_ASSISTANT_ID")) || process.env.VAPI_ASSISTANT_ID;

  if (!publicKey || !assistantId) {
    // 200 (not 503) so an unconfigured widget doesn't log a console error on
    // every public page; the widget simply doesn't render.
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({ configured: true, publicKey, assistantId });
}
