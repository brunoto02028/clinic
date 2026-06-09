// app/api/vapi/web-token/route.ts
// GET — returns Vapi public key + assistant ID for the web widget
// This endpoint is intentionally public (no auth required) so the widget
// can initialise without a logged-in session.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = process.env.VAPI_PUBLIC_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  if (!publicKey || !assistantId) {
    return NextResponse.json(
      { error: "Voice assistant not configured yet." },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey, assistantId });
}
