import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { clearConfigCache } from "@/lib/system-config";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ALGO = "aes-256-cbc";
function getEncKey() {
  const raw = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || "default-key-change-me";
  return crypto.createHash("sha256").update(raw).digest();
}
function encrypt(text: string) {
  const key = getEncKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "SUPERADMIN" && role !== "ADMIN") return null;
  return session;
}

// GET — list all email accounts (password masked)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const accounts = await (prisma as any).emailAccount.findMany({
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    const safe = accounts.map((a: any) => ({
      id: a.id,
      label: a.label,
      email: a.email,
      smtpHost: a.smtpHost,
      smtpPort: a.smtpPort,
      smtpUser: a.smtpUser,
      emailFrom: a.emailFrom,
      isPrimary: a.isPrimary,
      isActive: a.isActive,
      lastSyncAt: a.lastSyncAt,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({ accounts: safe });
  } catch (error) {
    console.error("[email-config] GET error:", error);
    return NextResponse.json({ accounts: [] });
  }
}

// POST — create or update an email account
export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id, label, email, smtpHost, smtpPort, smtpUser, smtpPass, emailFrom, isPrimary } = body;

    if (!email || !smtpHost || !smtpUser) {
      return NextResponse.json({ error: "Email, SMTP Host, and SMTP User are required" }, { status: 400 });
    }

    const encPass = smtpPass ? encrypt(smtpPass) : undefined;

    // If setting as primary, unset others first
    if (isPrimary) {
      await (prisma as any).emailAccount.updateMany({ data: { isPrimary: false } });
    }

    let account;
    if (id) {
      // Update existing
      const updateData: any = { label, email, smtpHost, smtpPort: smtpPort || "465", smtpUser, emailFrom: emailFrom || `${label} <${email}>`, isPrimary: !!isPrimary, isActive: true };
      if (encPass) updateData.smtpPass = encPass;
      account = await (prisma as any).emailAccount.update({ where: { id }, data: updateData });
    } else {
      // Create new — allow without password (inactive until password set)
      const count = await (prisma as any).emailAccount.count();
      const hasPass = !!smtpPass;
      account = await (prisma as any).emailAccount.create({
        data: {
          label: label || email,
          email,
          smtpHost,
          smtpPort: smtpPort || "465",
          smtpUser,
          smtpPass: encPass || "NEEDS_PASSWORD",
          emailFrom: emailFrom || `${label || "Clinic"} <${email}>`,
          isPrimary: hasPass ? (isPrimary ?? count === 0) : false,
          isActive: hasPass,
        },
      });
    }

    // Sync primary account to SystemConfig for backward compatibility
    await syncPrimaryToSystemConfig();

    return NextResponse.json({ success: true, account: { id: account.id, label: account.label, email: account.email, isPrimary: account.isPrimary } });
  } catch (error: any) {
    console.error("[email-config] POST error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save account" }, { status: 500 });
  }
}

// PUT — set primary / toggle active
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, action } = await request.json();
    if (!id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    if (action === "setPrimary") {
      await (prisma as any).emailAccount.updateMany({ data: { isPrimary: false } });
      await (prisma as any).emailAccount.update({ where: { id }, data: { isPrimary: true } });
      await syncPrimaryToSystemConfig();
      return NextResponse.json({ success: true, message: "Primary account updated" });
    }

    if (action === "toggleActive") {
      const acct = await (prisma as any).emailAccount.findUnique({ where: { id } });
      if (!acct) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await (prisma as any).emailAccount.update({ where: { id }, data: { isActive: !acct.isActive } });
      return NextResponse.json({ success: true, active: !acct.isActive });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[email-config] PUT error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE — delete an email account
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Account ID required" }, { status: 400 });

    const acct = await (prisma as any).emailAccount.findUnique({ where: { id } });
    if (!acct) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await (prisma as any).emailAccount.delete({ where: { id } });

    // If deleted account was primary, promote another
    if (acct.isPrimary) {
      const next = await (prisma as any).emailAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
      if (next) {
        await (prisma as any).emailAccount.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    }

    await syncPrimaryToSystemConfig();

    return NextResponse.json({ success: true, message: `Account ${acct.email} deleted` });
  } catch (error) {
    console.error("[email-config] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

// Sync primary EmailAccount → SystemConfig for backward compatibility with sendEmail/IMAP
async function syncPrimaryToSystemConfig() {
  try {
    const primary = await (prisma as any).emailAccount.findFirst({ where: { isPrimary: true, isActive: true } });
    const LABELS: Record<string, string> = { SMTP_HOST: "SMTP Host", SMTP_PORT: "SMTP Port", SMTP_USER: "SMTP Username / Email", SMTP_PASS: "SMTP Password", EMAIL_FROM: "Email From Address" };

    if (primary) {
      const pairs: [string, string, boolean][] = [
        ["SMTP_HOST", primary.smtpHost, false],
        ["SMTP_PORT", primary.smtpPort, false],
        ["SMTP_USER", primary.smtpUser, false],
        ["SMTP_PASS", primary.smtpPass, true],
        ["EMAIL_FROM", primary.emailFrom, false],
      ];
      for (const [key, value, isSecret] of pairs) {
        const existing = await prisma.systemConfig.findUnique({ where: { key } });
        if (existing) {
          await prisma.systemConfig.update({ where: { key }, data: { value, isActive: true } });
        } else {
          await (prisma.systemConfig as any).create({ data: { key, value, isActive: true, isSecret, category: "email", label: LABELS[key] || key } });
        }
      }
    } else {
      // No primary — deactivate SMTP config
      for (const key of Object.keys(LABELS)) {
        const existing = await prisma.systemConfig.findUnique({ where: { key } });
        if (existing) await prisma.systemConfig.update({ where: { key }, data: { isActive: false } });
      }
    }

    clearConfigCache();
  } catch (err) {
    console.warn("[email-config] syncPrimaryToSystemConfig error:", err);
  }
}
