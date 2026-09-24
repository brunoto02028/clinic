import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { closePatientAccount, AccountClosureError } from "@/lib/account-closure";

export const dynamic = "force-dynamic";

/**
 * The patient closing their own account.
 *
 * `skipConsent`, and deliberately so: someone who never accepted the Terms is
 * exactly the person most likely to want out, and the consent wall must not be
 * the thing that keeps them in.
 *
 * Confirmation is the current password, because the alternative — a session
 * alone — means a borrowed, unlocked phone can erase a health record. An
 * account created through Google has no password to give, so those confirm by
 * typing their own e-mail address, which is the same shape of proof: something
 * the person knows, not merely something the device holds.
 */
export async function POST(req: NextRequest) {
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // An admin previewing a patient's portal must not be able to end it. The
  // same rule the consent route applies, for the same reason.
  if (effective.isImpersonating) {
    return NextResponse.json(
      {
        error: "Read-only during impersonation",
        errorPt: "Somente leitura durante a visualização como paciente",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const password: string | undefined = body?.password;
  const confirmEmail: string | undefined = body?.confirmEmail;

  const me = await prisma.user.findUnique({
    where: { id: effective.userId },
    select: { id: true, email: true, password: true },
  });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (me.password) {
    if (!password || !(await bcrypt.compare(password, me.password))) {
      return NextResponse.json(
        {
          error: "That password is not right.",
          errorPt: "Essa senha não está certa.",
          code: "wrong_password",
        },
        { status: 403 }
      );
    }
  } else {
    // No password on the account (created through Google).
    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== me.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Type your e-mail address to confirm.",
          errorPt: "Digite seu e-mail para confirmar.",
          code: "confirm_email_required",
        },
        { status: 403 }
      );
    }
  }

  try {
    const { closedAt } = await closePatientAccount({
      userId: me.id,
      ipAddress:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ closed: true, closedAt });
  } catch (e) {
    if (e instanceof AccountClosureError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[delete-account] failed:", (e as any)?.message);
    return NextResponse.json(
      {
        error: "We could not close your account. Please try again.",
        errorPt: "Não foi possível encerrar sua conta. Tente de novo.",
      },
      { status: 500 }
    );
  }
}
