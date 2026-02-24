import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhook } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/whatsapp — Meta webhook verification
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode") || "";
  const token = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";

  const result = verifyWebhook({ mode, token, challenge });
  if (result) {
    return new NextResponse(result, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp — Receive incoming messages & status updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Process each entry
    const entries = body?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;

        // Status updates (sent, delivered, read)
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          try {
            const existing = await (prisma as any).whatsAppMessage.findFirst({
              where: { providerMessageId: status.id },
            });
            if (existing) {
              const statusMap: Record<string, string> = {
                sent: "SENT",
                delivered: "DELIVERED",
                read: "READ",
                failed: "FAILED",
              };
              await (prisma as any).whatsAppMessage.update({
                where: { id: existing.id },
                data: {
                  status: statusMap[status.status] || existing.status,
                  ...(status.status === "delivered" ? { deliveredAt: new Date() } : {}),
                  ...(status.status === "read" ? { readAt: new Date() } : {}),
                  ...(status.status === "failed" ? { errorMessage: status.errors?.[0]?.title || "Unknown error" } : {}),
                },
              });
            }
          } catch (e) {
            console.error("[whatsapp-webhook] Status update error:", e);
          }
        }

        // Incoming messages
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];
        for (const msg of messages) {
          try {
            const contact = contacts.find((c: any) => c.wa_id === msg.from);
            const fromPhone = msg.from ? `+${msg.from}` : "";
            const fromName = contact?.profile?.name || "";
            const messageBody = msg.text?.body || msg.caption || "[media]";

            // Try to find patient by phone
            let patientId: string | null = null;
            if (fromPhone) {
              const patient = await prisma.user.findFirst({
                where: {
                  OR: [
                    { phone: fromPhone },
                    { phone: fromPhone.replace("+", "") },
                    { phone: { endsWith: fromPhone.slice(-10) } },
                  ],
                  role: "PATIENT" as any,
                },
                select: { id: true },
              });
              patientId = patient?.id || null;
            }

            await (prisma as any).whatsAppMessage.create({
              data: {
                direction: "INBOUND",
                status: "RECEIVED",
                fromPhone,
                fromName,
                messageBody,
                providerMessageId: msg.id,
                patientId,
                receivedAt: new Date(),
                messageType: msg.type || "text",
              },
            });

            console.log(`[whatsapp-webhook] Inbound message from ${fromPhone}: ${messageBody.slice(0, 50)}`);
          } catch (e) {
            console.error("[whatsapp-webhook] Message processing error:", e);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[whatsapp-webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
