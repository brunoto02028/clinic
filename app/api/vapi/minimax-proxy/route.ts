// app/api/vapi/minimax-proxy/route.ts
//
// Proxy: Vapi (formato OpenAI) → OpenRouter. Serve streaming (SSE) e não.
//
// **O nome do caminho é histórico, e fica.** A MiniMax saiu em 01/10/2026 (117),
// mas o URL deste proxy está configurado no painel do Vapi, fora do repo —
// renomear a rota derrubaria a recepcionista por voz em silêncio, e o erro só
// apareceria quando alguém ligasse para a clínica. Renomear exige publicar o
// endereço novo no Vapi primeiro.

import { NextRequest, NextResponse } from "next/server";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-5";

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function POST(req: NextRequest) {
  const orKey = await getConfigValue("OPENROUTER_API_KEY");
  if (!orKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
  }
  return handleOpenRouter(req, orKey);
}

async function handleOpenRouter(req: NextRequest, apiKey: string): Promise<Response> {
  try {
    const body = await req.json();
    const isStreaming = body.stream === true;

    const payload = {
      ...body,
      model: OPENROUTER_MODEL,
      stream: isStreaming,
    };

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bpr.clinic",
        "X-Title": "BPR Vapi Proxy",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("[vapi-proxy] OpenRouter error:", upstream.status, err);
      return NextResponse.json({ error: err }, { status: upstream.status });
    }

    if (isStreaming && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    console.error("[vapi-proxy] OpenRouter error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
