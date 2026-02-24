export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// Generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, channel } = body ?? {};

    if (!userId || !channel) {
      return NextResponse.json(
        { error: "userId and channel are required" },
        { status: 400 }
      );
    }

    if (!["EMAIL", "SMS", "WHATSAPP"].includes(channel)) {
      return NextResponse.json(
        { error: "Invalid channel. Must be EMAIL, SMS, or WHATSAPP" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        isActive: true,
        preferredLocale: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If already active, no need to verify
    if (user.isActive) {
      return NextResponse.json(
        { error: "Account is already verified" },
        { status: 400 }
      );
    }

    // Rate limiting: max 3 codes in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCodes = await prisma.verificationCode.count({
      where: {
        userId,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentCodes >= 3) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a few minutes before requesting a new code." },
        { status: 429 }
      );
    }

    // For SMS/WhatsApp, phone is required
    if ((channel === "SMS" || channel === "WHATSAPP") && !user.phone) {
      return NextResponse.json(
        { error: "No phone number on file. Please use email verification." },
        { status: 400 }
      );
    }

    // Generate code and save
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any previous unused codes for this user
    await prisma.verificationCode.updateMany({
      where: { userId, verified: false },
      data: { expiresAt: new Date(0) }, // Expire them
    });

    await prisma.verificationCode.create({
      data: {
        userId,
        code,
        channel: channel as any,
        phone: channel !== "EMAIL" ? user.phone : null,
        email: channel === "EMAIL" ? user.email : null,
        expiresAt,
      },
    });

    const isPt = user.preferredLocale === "pt-BR";

    // Send via chosen channel
    if (channel === "EMAIL") {
      await sendEmail({
        to: user.email,
        subject: isPt
          ? `${code} — Código de verificação`
          : `${code} — Verification code`,
        html: buildVerificationEmailHtml(code, user.firstName, isPt),
      });
    } else if (channel === "SMS") {
      // Twilio SMS — requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
      const sent = await sendSMS(
        user.phone!,
        isPt
          ? `Seu código de verificação BPR: ${code}. Expira em 10 minutos.`
          : `Your BPR verification code: ${code}. Expires in 10 minutes.`
      );
      if (!sent) {
        return NextResponse.json(
          { error: "Failed to send SMS. Please try email instead." },
          { status: 500 }
        );
      }
    } else if (channel === "WHATSAPP") {
      // Meta Cloud API or Twilio WhatsApp
      const sent = await sendWhatsApp(
        user.phone!,
        isPt
          ? `Seu código de verificação BPR: ${code}. Expira em 10 minutos.`
          : `Your BPR verification code: ${code}. Expires in 10 minutes.`
      );
      if (!sent) {
        return NextResponse.json(
          { error: "Failed to send WhatsApp message. Please try email instead." },
          { status: 500 }
        );
      }
    }

    // Mask contact info for the response
    const maskedEmail = maskEmail(user.email);
    const maskedPhone = user.phone ? maskPhone(user.phone) : null;

    return NextResponse.json({
      success: true,
      channel,
      maskedContact: channel === "EMAIL" ? maskedEmail : maskedPhone,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}

// ─── Email HTML builder ───────────────────────────────────
function buildVerificationEmailHtml(code: string, firstName: string, isPt: boolean): string {
  const digits = code.split("");
  const digitBoxes = digits
    .map(
      (d) =>
        `<span style="display:inline-block;width:40px;height:48px;line-height:48px;text-align:center;font-size:24px;font-weight:bold;border:2px solid #e2e8f0;border-radius:8px;margin:0 3px;background:#f8fafc;color:#1e293b;">${d}</span>`
    )
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h2 style="color:#1e293b;margin:0 0 8px;">${isPt ? `Olá, ${firstName}!` : `Hello, ${firstName}!`}</h2>
      <p style="color:#64748b;margin:0 0 24px;font-size:15px;">
        ${isPt ? "Use o código abaixo para verificar sua conta:" : "Use the code below to verify your account:"}
      </p>
      <div style="text-align:center;margin:24px 0;">
        ${digitBoxes}
      </div>
      <p style="color:#94a3b8;font-size:13px;text-align:center;margin:16px 0 0;">
        ${isPt ? "Este código expira em 10 minutos." : "This code expires in 10 minutes."}
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">
        ${isPt ? "Se você não solicitou este código, ignore este email." : "If you didn't request this code, please ignore this email."}
      </p>
    </div>
  `;
}

// ─── SMS via Twilio ───────────────────────────────────────
async function sendSMS(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio credentials not configured — SMS not sent");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: message,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Twilio SMS error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Twilio SMS exception:", err);
    return false;
  }
}

// ─── WhatsApp via Meta Cloud API ──────────────────────────
async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !accessToken) {
    console.warn("WhatsApp credentials not configured — message not sent");
    return false;
  }

  try {
    // Format phone: remove + and spaces, ensure starts with country code
    const cleanPhone = to.replace(/[\s\-\+\(\)]/g, "");

    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("WhatsApp API error:", err);
      return false;
    }
    return true;
  } catch (err) {
    console.error("WhatsApp exception:", err);
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${local[1]}${"*".repeat(Math.min(local.length - 2, 6))}@${domain}`;
}

function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 6) return "***" + clean.slice(-2);
  return clean.slice(0, 3) + "*".repeat(clean.length - 5) + clean.slice(-2);
}
