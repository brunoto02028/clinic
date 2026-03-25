/**
 * Telegram Bot Integration
 * 
 * Required env var:
 *   TELEGRAM_BOT_TOKEN — Bot token from @BotFather
 * 
 * Usage:
 *   import { sendTelegramMessage, isTelegramConfigured } from '@/lib/telegram'
 */

import { prisma } from "@/lib/db";

const TELEGRAM_API = "https://api.telegram.org";

function getConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  };
}

export function isTelegramConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.botToken && cfg.botToken.includes(":"));
}

export interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  replyToMessageId?: number;
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
}

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send a message via Telegram bot
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2"; disableNotification?: boolean }
): Promise<TelegramResult> {
  const cfg = getConfig();
  
  if (!cfg.botToken) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const params: Record<string, any> = {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || "HTML",
      disable_notification: options?.disableNotification || false,
    };

    const url = `${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await response.json() as any;

    if (data.ok) {
      return { success: true, messageId: data.result.message_id };
    } else {
      return { success: false, error: data.description || "Telegram API error" };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Set Telegram webhook or get bot info
 */
export async function getTelegramBotInfo(): Promise<{ ok: boolean; result?: any; error?: string }> {
  const cfg = getConfig();
  
  if (!cfg.botToken) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  try {
    const url = `${TELEGRAM_API}/bot${cfg.botToken}/getMe`;
    const response = await fetch(url);
    const data = await response.json() as any;
    
    if (data.ok) {
      return { ok: true, result: data.result };
    } else {
      return { ok: false, error: data.description };
    }
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send a message to a user by their Telegram chat_id stored in the database
 */
export async function sendTelegramToUser(
  userId: string,
  text: string,
  options?: { parseMode?: "HTML" | "MarkdownV2"; disableNotification?: boolean }
): Promise<TelegramResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user?.telegramChatId) {
      return { success: false, error: "User has no Telegram chat_id" };
    }

    return sendTelegramMessage(user.telegramChatId, text, options);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
