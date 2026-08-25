export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/callback — low-commitment "request a callback" from the home page
// (activity 17, C3). Creates a SalesLead so requests land in the existing
// admin sales pipeline (/admin/sales). Deliberately frictionless: honeypot +
// rate limit only, no Turnstile challenge. Only name + phone are required.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Anti-bot honeypot (activity 16): a real user never fills this hidden field.
    if (body?.website) {
      return NextResponse.json({ success: true }); // silently absorb bots
    }

    const ip = getClientIp(req);
    const rl = rateLimit(`callback:${ip ?? "unknown"}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const name = String(body?.name || "").trim();
    const phone = String(body?.phone || "").trim();
    const bestTime = String(body?.bestTime || "").trim();

    if (name.length < 2 || phone.replace(/[^0-9]/g, "").length < 6) {
      return NextResponse.json({ error: "A name and a valid phone number are required" }, { status: 400 });
    }

    const notes = [
      "Solicitou retorno de ligação (home).",
      bestTime ? `Melhor horário: ${bestTime}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    await prisma.salesLead.create({
      data: {
        name,
        phone,
        source: "website",
        stage: "new",
        priority: "high",
        interestedIn: "callback",
        notes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[callback] error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
