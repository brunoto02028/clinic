// app/api/vapi/assistant/route.ts
// GET — get current BPR Vapi assistant config
// POST — create/sync assistant with Vapi

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  vapiRequest,
  getVapiAssistantId,
  BPR_ASSISTANT_CONFIG,
} from "@/lib/vapi";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assistantId = getVapiAssistantId();
    if (!assistantId) {
      return NextResponse.json({
        configured: false,
        message: "VAPI_ASSISTANT_ID not set. Create the assistant first.",
      });
    }

    const assistant = await vapiRequest(`/assistant/${assistantId}`);
    return NextResponse.json({ configured: true, assistant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["ADMIN", "SUPERADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingId = getVapiAssistantId();

    if (existingId) {
      // Update existing assistant
      const assistant = await vapiRequest(`/assistant/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify(BPR_ASSISTANT_CONFIG),
      });
      return NextResponse.json({ action: "updated", assistant });
    }

    // Create new assistant
    const assistant = await vapiRequest("/assistant", {
      method: "POST",
      body: JSON.stringify(BPR_ASSISTANT_CONFIG),
    });

    return NextResponse.json({
      action: "created",
      assistant,
      note: `Add VAPI_ASSISTANT_ID=${assistant.id} to your environment variables.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
