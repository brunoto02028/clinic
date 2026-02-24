/**
 * Unified patient notification helper.
 * Reads the patient's communicationPreference and sends via the right channel.
 * Falls back to email if SMS/WhatsApp are not configured.
 */

import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { sendWhatsAppMessage, isWhatsAppConfigured, isWhatsAppConfiguredAsync } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

interface NotifyPatientParams {
  patientId: string;
  /** Email template slug (e.g. 'APPOINTMENT_CONFIRMATION') */
  emailTemplateSlug?: string;
  /** Template variables for email */
  emailVars?: Record<string, string>;
  /** Plain text message for SMS/WhatsApp (short, no HTML) */
  plainMessage: string;
  /** Optional: override the channel (skip preference lookup) */
  forceChannel?: "EMAIL" | "SMS" | "WHATSAPP";
}

export async function notifyPatient({
  patientId,
  emailTemplateSlug,
  emailVars = {},
  plainMessage,
  forceChannel,
}: NotifyPatientParams): Promise<{ channel: string; success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: patientId },
      select: {
        email: true,
        phone: true,
        firstName: true,
        communicationPreference: true,
      } as any,
    });

    if (!user) return { channel: "none", success: false, error: "Patient not found" };

    const u = user as any;
    const pref = forceChannel || u.communicationPreference || "EMAIL";
    const phone: string | null = u.phone || null;
    const email: string = u.email;
    const firstName: string = u.firstName || "Patient";

    // ─── WhatsApp ───
    const waConfigured = isWhatsAppConfigured() || await isWhatsAppConfiguredAsync();
    if (pref === "WHATSAPP" && phone && waConfigured) {
      const result = await sendWhatsAppMessage({
        to: phone,
        message: plainMessage,
        patientId,
        triggerEvent: emailTemplateSlug || "NOTIFICATION",
      });
      return { channel: "WHATSAPP", success: result.success, error: result.error };
    }

    // ─── SMS (Twilio) ───
    if (pref === "SMS" && phone) {
      const { getConfigValue } = await import("@/lib/system-config");
      const twilioSid = await getConfigValue("TWILIO_ACCOUNT_SID");
      const twilioToken = await getConfigValue("TWILIO_AUTH_TOKEN");
      const twilioFrom = await getConfigValue("TWILIO_PHONE_NUMBER");

      if (twilioSid && twilioToken && twilioFrom) {
        try {
          const cleanPhone = phone.replace(/[^+\d]/g, "");
          const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: cleanPhone, From: twilioFrom, Body: plainMessage }),
          });
          if (res.ok) {
            return { channel: "SMS", success: true };
          }
          const errText = await res.text();
          console.error("[notify-patient] Twilio SMS error:", errText);
        } catch (smsErr: any) {
          console.error("[notify-patient] SMS exception:", smsErr.message);
        }
      } else {
        console.log(`[notify-patient] SMS requested for ${patientId} but Twilio not configured. Falling back to email.`);
      }
      // Fall through to email
    }

    // ─── Email (default / fallback) ───
    if (emailTemplateSlug) {
      try {
        await sendTemplatedEmail(emailTemplateSlug as any, email, {
          patientName: firstName,
          ...emailVars,
        }, patientId);
        return { channel: "EMAIL", success: true };
      } catch (err: any) {
        return { channel: "EMAIL", success: false, error: err.message };
      }
    } else {
      // No template — send a plain email
      try {
        await sendEmail({
          to: email,
          subject: "BPR Rehab — Notification",
          html: `<p>Hi ${firstName},</p><p>${plainMessage}</p>`,
        });
        return { channel: "EMAIL", success: true };
      } catch (err: any) {
        return { channel: "EMAIL", success: false, error: err.message };
      }
    }
  } catch (err: any) {
    console.error("[notify-patient] Error:", err);
    return { channel: "none", success: false, error: err.message };
  }
}
