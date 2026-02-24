/**
 * WhatsApp Business API Integration
 * Supports Meta Cloud API (graph.facebook.com)
 * 
 * Required env vars:
 *   WHATSAPP_PHONE_NUMBER_ID   — Business phone number ID
 *   WHATSAPP_ACCESS_TOKEN      — Permanent access token
 *   WHATSAPP_BUSINESS_ACCOUNT_ID — Business account ID (optional, for templates)
 *   WHATSAPP_VERIFY_TOKEN      — Webhook verification token
 */

import { prisma } from "@/lib/db";

const GRAPH_API = "https://graph.facebook.com/v19.0";

function getConfig() {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "bpr-whatsapp-verify",
  };
}

export function isWhatsAppConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.phoneNumberId && cfg.accessToken);
}

// ─── Send a text message ───
export async function sendWhatsAppMessage(params: {
  to: string;            // E.164 phone number (e.g. +447123456789)
  message: string;
  patientId?: string;
  clinicId?: string;
  triggerEvent?: string;
  relatedEntityId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cfg = getConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    console.warn("[whatsapp] Not configured, skipping message");
    return { success: false, error: "WhatsApp not configured" };
  }

  // Normalize phone number
  const phone = params.to.replace(/[^+\d]/g, "");

  try {
    const res = await fetch(`${GRAPH_API}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { body: params.message },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data);
      console.error("[whatsapp] Send failed:", errorMsg);

      // Log to DB
      await logWhatsAppMessage({
        ...params,
        toPhone: phone,
        status: "FAILED",
        errorMessage: errorMsg,
      });

      return { success: false, error: errorMsg };
    }

    const providerMessageId = data?.messages?.[0]?.id;

    // Log to DB
    await logWhatsAppMessage({
      ...params,
      toPhone: phone,
      status: "SENT",
      providerMessageId,
    });

    return { success: true, messageId: providerMessageId };
  } catch (err: any) {
    console.error("[whatsapp] Error:", err.message);
    await logWhatsAppMessage({
      ...params,
      toPhone: phone,
      status: "FAILED",
      errorMessage: err.message,
    });
    return { success: false, error: err.message };
  }
}

// ─── Send a template message ───
export async function sendWhatsAppTemplate(params: {
  to: string;
  templateName: string;
  templateParams?: string[];    // Positional parameters for the template body
  language?: string;            // e.g. "en_US", "pt_BR"
  patientId?: string;
  clinicId?: string;
  triggerEvent?: string;
  relatedEntityId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const cfg = getConfig();
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { success: false, error: "WhatsApp not configured" };
  }

  const phone = params.to.replace(/[^+\d]/g, "");
  const lang = params.language || "en_US";

  const components: any[] = [];
  if (params.templateParams && params.templateParams.length > 0) {
    components.push({
      type: "body",
      parameters: params.templateParams.map((p) => ({ type: "text", text: p })),
    });
  }

  try {
    const res = await fetch(`${GRAPH_API}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: params.templateName,
          language: { code: lang },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data);
      await logWhatsAppMessage({
        ...params,
        toPhone: phone,
        status: "FAILED",
        errorMessage: errorMsg,
        templateName: params.templateName,
      });
      return { success: false, error: errorMsg };
    }

    const providerMessageId = data?.messages?.[0]?.id;
    await logWhatsAppMessage({
      ...params,
      toPhone: phone,
      status: "SENT",
      providerMessageId,
      templateName: params.templateName,
    });

    return { success: true, messageId: providerMessageId };
  } catch (err: any) {
    await logWhatsAppMessage({
      ...params,
      toPhone: phone,
      status: "FAILED",
      errorMessage: err.message,
      templateName: params.templateName,
    });
    return { success: false, error: err.message };
  }
}

// ─── AI-generated WhatsApp message ───
export async function sendAIWhatsAppMessage(params: {
  to: string;
  patientName: string;
  context: string;           // e.g. "appointment_reminder", "treatment_ready"
  additionalInfo?: string;   // Extra context for the AI
  patientId?: string;
  clinicId?: string;
  triggerEvent?: string;
  relatedEntityId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Generate humanized message via AI
    const prompt = `You are a friendly and professional virtual assistant for Bruno Physical Rehabilitation clinic. 
Generate a short WhatsApp message (max 200 words) for a patient named "${params.patientName}".

Context: ${params.context}
${params.additionalInfo ? `Additional info: ${params.additionalInfo}` : ""}

Rules:
- Be warm, empathetic, and professional
- Use clear, simple language
- Include relevant emojis (1-3 max)
- Don't include any links (we'll add those separately)
- Sign off as "Bruno Physical Rehabilitation Team"
- Keep it concise — it's a WhatsApp message, not an email
- If context is in Portuguese, write in Portuguese. Otherwise, write in English.`;

    let message = "";

    try {
      const { callAI } = await import("@/lib/ai-provider");
      message = await callAI(prompt, { temperature: 0.7, maxTokens: 300 });
    } catch {
      // AI not available, will use fallback below
    }

    if (!message) {
      // Fallback to a simple template
      const fallbacks: Record<string, string> = {
        appointment_reminder: `Hi ${params.patientName}! Just a friendly reminder about your upcoming appointment. See you soon! - Bruno Physical Rehabilitation Team`,
        treatment_ready: `Hi ${params.patientName}! Your treatment plan is ready. Please log in to your portal to review it. - Bruno Physical Rehabilitation Team`,
        payment_required: `Hi ${params.patientName}! Your treatment package is ready for payment. Complete it through your portal to start your sessions. - Bruno Physical Rehabilitation Team`,
        treatment_completed: `Congratulations ${params.patientName}! You've completed your treatment. Consider joining our membership to stay connected! - Bruno Physical Rehabilitation Team`,
        welcome: `Welcome ${params.patientName}! Thank you for joining Bruno Physical Rehabilitation. Your patient portal is ready. - Bruno Physical Rehabilitation Team`,
      };
      message = fallbacks[params.context] || `Hi ${params.patientName}! This is a message from Bruno Physical Rehabilitation. - BPR Team`;
    }

    return await sendWhatsAppMessage({
      to: params.to,
      message,
      patientId: params.patientId,
      clinicId: params.clinicId,
      triggerEvent: params.triggerEvent || params.context,
      relatedEntityId: params.relatedEntityId,
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Log message to DB ───
async function logWhatsAppMessage(params: {
  toPhone: string;
  patientId?: string;
  clinicId?: string;
  status: string;
  providerMessageId?: string;
  errorMessage?: string;
  templateName?: string;
  message?: string;
  triggerEvent?: string;
  relatedEntityId?: string;
}) {
  try {
    await (prisma as any).whatsAppMessage.create({
      data: {
        clinicId: params.clinicId || null,
        patientId: params.patientId || null,
        direction: "OUTBOUND",
        status: params.status,
        toPhone: params.toPhone,
        templateName: params.templateName || null,
        messageBody: params.message || null,
        providerMessageId: params.providerMessageId || null,
        errorMessage: params.errorMessage || null,
        triggerEvent: params.triggerEvent || null,
        relatedEntityId: params.relatedEntityId || null,
        sentAt: params.status === "SENT" ? new Date() : null,
      },
    });
  } catch (err) {
    console.error("[whatsapp] Failed to log message:", err);
  }
}

// ─── Webhook verification (for Meta webhook setup) ───
export function verifyWebhook(params: {
  mode: string;
  token: string;
  challenge: string;
}): string | null {
  const cfg = getConfig();
  if (params.mode === "subscribe" && params.token === cfg.verifyToken) {
    return params.challenge;
  }
  return null;
}
