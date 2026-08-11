// app/api/vapi/minimax-proxy/route.ts
// Proxy: Vapi (OpenAI-format) → OpenRouter (primary) or Minimax API (fallback)
// Handles both streaming (SSE) and non-streaming requests.
// In AI_STRICT_MODE: only OpenRouter is used.

import { NextRequest, NextResponse } from "next/server";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

const MINIMAX_BASE = "https://api.minimaxi.chat/v1";
const MINIMAX_MODEL = "MiniMax-M3";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-5";

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function POST(req: NextRequest) {
  const orKey = await getConfigValue("OPENROUTER_API_KEY");
  const useOpenRouter = process.env.AI_STRICT_MODE === 'true' || !!orKey;

  if (useOpenRouter) {
    if (!orKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
    }
    return handleOpenRouter(req, orKey);
  }

  const apiKey = await getConfigValue("MINIMAX_API_KEY");
  if (!apiKey) {
    return NextResponse.json({ error: "MINIMAX_API_KEY not configured" }, { status: 503 });
  }
  return handleMinimax(req, apiKey);
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

async function handleMinimax(req: NextRequest, apiKey: string): Promise<Response> {
  try {
    const body = await req.json();
    const isStreaming = body.stream === true;

    const payload = {
      ...body,
      model: body.model || MINIMAX_MODEL,
      stream: isStreaming,
      thinking: { type: "disabled" },
    };

    const upstream = await fetch(`${MINIMAX_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error("[minimax-proxy] Upstream error:", upstream.status, err);
      return NextResponse.json({ error: err }, { status: upstream.status });
    }

    if (isStreaming && upstream.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let thinkBuffer = "";
      let insideThink = false;

      const stream = new ReadableStream({
        async start(controller) {
          const reader = upstream.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (!line.startsWith("data: ")) {
                  controller.enqueue(encoder.encode(line + "\n"));
                  continue;
                }

                const data = line.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content ?? "";

                  let filtered = "";
                  let remaining = thinkBuffer + delta;
                  thinkBuffer = "";

                  while (remaining.length > 0) {
                    if (insideThink) {
                      const end = remaining.indexOf("</think>");
                      if (end === -1) { thinkBuffer = remaining; remaining = ""; }
                      else { insideThink = false; remaining = remaining.slice(end + 8); }
                    } else {
                      const start = remaining.indexOf("<think>");
                      if (start === -1) { filtered += remaining; remaining = ""; }
                      else { filtered += remaining.slice(0, start); insideThink = true; remaining = remaining.slice(start + 7); }
                    }
                  }

                  if (filtered) {
                    parsed.choices[0].delta.content = filtered;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`));
                  }
                } catch {
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              }
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await upstream.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      data.choices[0].message.content = stripThink(content);
    }
    return NextResponse.json(data, { status: upstream.status });

  } catch (err: any) {
    console.error("[minimax-proxy] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
