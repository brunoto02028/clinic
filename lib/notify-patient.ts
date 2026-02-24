/**
 * Unified patient notification helper.
 * Reads the patient's communicationPreference and sends via the right channel.
 * Falls back to email if SMS/WhatsApp are not configured.
 */

import { prisma } from "@/lib/db";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
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
    if (pref === "WHATSAPP" && phone && isWhatsAppConfigured()) {
      const result = await sendWhatsAppMessage({
        to: phone,
        message: plainMessage,
        patientId,
        triggerEvent: emailTemplateSlug || "NOTIFICATION",
      });
      return { channel: "WHATSAPP", success: result.success, error: result.error };
    }

    // ─── SMS ───
    if (pref === "SMS" && phone) {
      // Use the /api/auth/send-code pattern — or a dedicated SMS provider
      // For now, SMS falls through to email with a console log
      console.log(`[notify-patient] SMS requested for ${patientId} but no SMS provider configured. Falling back to email.`);
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
