import { prisma } from "@/lib/db";
import crypto from "crypto";

// Simple AES-256 encryption for API keys stored in DB
const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.SECRET_KEY || "default-clinic-secret-key-32ch!";
const ALGORITHM = "aes-256-cbc";

function getKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

export function encryptValue(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey() as any, iv as any);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptValue(encrypted: string): string {
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return encrypted;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey() as any, iv as any);
    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encrypted;
  }
}

// ─── Read config value from DB, fallback to env ───

const configCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute

export async function getConfigValue(key: string): Promise<string | null> {
  // Check cache first
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  try {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    if (config?.isActive && config.value) {
      const value = config.isSecret ? decryptValue(config.value) : config.value;
      configCache.set(key, { value, timestamp: Date.now() });
      return value;
    }
  } catch (err) {
    console.warn(`[system-config] Failed to read ${key} from DB:`, err);
  }

  // Fallback to environment variable
  const envValue = process.env[key] || null;
  if (envValue) {
    configCache.set(key, { value: envValue, timestamp: Date.now() });
  }
  return envValue;
}

export function clearConfigCache(key?: string) {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
}

// ─── Default configuration entries ───

export const DEFAULT_CONFIGS = [
  {
    key: "GEMINI_API_KEY",
    label: "Google Gemini API Key",
    description: "Used for AI-powered voice fill, caption generation, and content analysis. Get your key at aistudio.google.com/apikey",
    category: "ai",
    isSecret: true,
  },
  {
    key: "ABACUS_API_KEY",
    label: "Abacus AI API Key",
    description: "Unified AI gateway — access GPT-5, Claude 4.5, Gemini 3, FLUX-2 PRO, DALL-E and more through one API. Get your key at abacus.ai/app/route-llm-apis",
    category: "ai",
    isSecret: true,
  },
  {
    key: "AI_DEFAULT_PROVIDER",
    label: "Default AI Provider",
    description: "Which AI provider to use by default: 'auto' (prefer Abacus, fallback Gemini), 'abacus' (Abacus RouteLLM), or 'gemini' (Google Gemini direct)",
    category: "ai",
    isSecret: false,
  },
  {
    key: "AI_IMAGE_MODEL",
    label: "AI Image Generation Model",
    description: "Model for image generation via Abacus: flux-2-pro (recommended), dall-e, ideogram, seedream, imagen, recraft",
    category: "ai",
    isSecret: false,
  },
  {
    key: "OPENAI_API_KEY",
    label: "OpenAI API Key",
    description: "Used for body assessment AI analysis (GPT-4 Vision). Get your key at platform.openai.com/api-keys",
    category: "ai",
    isSecret: true,
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend Email API Key",
    description: "Used for sending emails (password reset, alerts, notifications). Get your key at resend.com",
    category: "email",
    isSecret: true,
  },
  {
    key: "SMTP_HOST",
    label: "SMTP Host",
    description: "SMTP server hostname (e.g. smtp.hostinger.com for Hostinger email)",
    category: "email",
    isSecret: false,
  },
  {
    key: "SMTP_PORT",
    label: "SMTP Port",
    description: "SMTP port (465 for SSL, 587 for TLS). Hostinger uses 465.",
    category: "email",
    isSecret: false,
  },
  {
    key: "SMTP_USER",
    label: "SMTP Username / Email",
    description: "Your email address (e.g. admin@bpr.rehab)",
    category: "email",
    isSecret: false,
  },
  {
    key: "SMTP_PASS",
    label: "SMTP Password",
    description: "Password for your Hostinger email account",
    category: "email",
    isSecret: true,
  },
  {
    key: "EMAIL_FROM",
    label: "Email From Address",
    description: "Sender name and email (e.g. Bruno Physical Rehabilitation <admin@bpr.rehab>)",
    category: "email",
    isSecret: false,
  },
  {
    key: "FACEBOOK_APP_ID",
    label: "Facebook App ID",
    description: "Used for Instagram/Facebook social media integration. Create an app at developers.facebook.com",
    category: "integration",
    isSecret: false,
  },
  {
    key: "FACEBOOK_APP_SECRET",
    label: "Facebook App Secret",
    description: "Secret key for Facebook/Instagram OAuth. Found in your Facebook app settings.",
    category: "integration",
    isSecret: true,
  },
  {
    key: "INSTAGRAM_ACCESS_TOKEN",
    label: "Instagram Access Token",
    description: "Long-lived access token for Instagram Graph API. Generate at developers.facebook.com → your app → Instagram → Generate Token.",
    category: "integration",
    isSecret: true,
  },
  {
    key: "INSTAGRAM_BUSINESS_ACCOUNT_ID",
    label: "Instagram Business Account ID",
    description: "Your Instagram Business or Creator account ID. Found in Instagram → Settings → Account → Professional Account.",
    category: "integration",
    isSecret: false,
  },
  {
    key: "AWS_ACCESS_KEY_ID",
    label: "AWS Access Key ID",
    description: "Used for S3 file storage (optional). Found in your AWS IAM console.",
    category: "integration",
    isSecret: false,
  },
  {
    key: "AWS_SECRET_ACCESS_KEY",
    label: "AWS Secret Access Key",
    description: "Secret key for AWS S3 storage. Found in your AWS IAM console.",
    category: "integration",
    isSecret: true,
  },
  {
    key: "AWS_S3_BUCKET",
    label: "AWS S3 Bucket Name",
    description: "The S3 bucket name for file uploads (e.g. clinic-uploads).",
    category: "integration",
    isSecret: false,
  },
  {
    key: "AWS_REGION",
    label: "AWS Region",
    description: "AWS region for S3 (e.g. eu-west-2, us-east-1).",
    category: "integration",
    isSecret: false,
  },
  // ─── WhatsApp (Meta Cloud API) ───
  {
    key: "WHATSAPP_PHONE_NUMBER_ID",
    label: "WhatsApp Phone Number ID",
    description: "Meta Business phone number ID. Found in Meta Business Suite → WhatsApp → Phone Numbers → API Setup.",
    category: "messaging",
    isSecret: false,
  },
  {
    key: "WHATSAPP_ACCESS_TOKEN",
    label: "WhatsApp Access Token",
    description: "Permanent access token for WhatsApp Cloud API. Generate in Meta Business Suite → System Users → Generate Token.",
    category: "messaging",
    isSecret: true,
  },
  {
    key: "WHATSAPP_BUSINESS_ACCOUNT_ID",
    label: "WhatsApp Business Account ID",
    description: "Your WhatsApp Business Account ID. Found in Meta Business Settings → Business Info.",
    category: "messaging",
    isSecret: false,
  },
  // ─── Twilio SMS ───
  {
    key: "TWILIO_ACCOUNT_SID",
    label: "Twilio Account SID",
    description: "Twilio account SID for SMS. Found at twilio.com/console.",
    category: "messaging",
    isSecret: false,
  },
  {
    key: "TWILIO_AUTH_TOKEN",
    label: "Twilio Auth Token",
    description: "Twilio auth token for SMS. Found at twilio.com/console.",
    category: "messaging",
    isSecret: true,
  },
  {
    key: "TWILIO_PHONE_NUMBER",
    label: "Twilio Phone Number",
    description: "Twilio phone number for sending SMS (E.164 format, e.g. +447123456789).",
    category: "messaging",
    isSecret: false,
  },
  // ─── Companies House API ───
  {
    key: "COMPANIES_HOUSE_API_KEY",
    label: "Companies House API Key",
    description: "REST API key from developer.company-information.service.gov.uk. Used to search and fetch company data.",
    category: "integration",
    isSecret: true,
  },
  {
    key: "COMPANIES_HOUSE_OAUTH_CLIENT_ID",
    label: "Companies House OAuth Client ID",
    description: "OAuth 2.0 Client ID for Companies House filing and identity APIs.",
    category: "integration",
    isSecret: false,
  },
  {
    key: "COMPANIES_HOUSE_OAUTH_CLIENT_SECRET",
    label: "Companies House OAuth Client Secret",
    description: "OAuth 2.0 Client Secret for Companies House.",
    category: "integration",
    isSecret: true,
  },
  {
    key: "COMPANIES_HOUSE_OAUTH_REDIRECT_URI",
    label: "Companies House OAuth Redirect URI",
    description: "Callback URL for Companies House OAuth flow (e.g. https://bpr.rehab/api/government/callback/companies-house).",
    category: "integration",
    isSecret: false,
  },
];
