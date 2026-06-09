// app/api/vapi/minimax-proxy/route.ts
// Proxy: Vapi (OpenAI-format) → Minimax API
// Vapi sends requests here; we forward to Minimax with our API key.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MINIMAX_BASE = "https://api.minimaxi.chat/v1";
const MINIMAX_MODEL = "MiniMax-M3";

export async function POST(req: NextRequest) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "MINIMAX_API_KEY not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();

    // Use configured model if not specified, or keep what Vapi sends
    const payload = {
      ...body,
      model: body.model || MINIMAX_MODEL,
    };

    const upstream = await fetch(`${MINIMAX_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    console.error("[minimax-proxy] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
