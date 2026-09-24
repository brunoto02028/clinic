export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { NON_EMERGENCY_NOTICE_VERSION } from "@/lib/non-emergency-notice";

/**
 * The patient saying, once, that they read "this is not an emergency service"
 * (activity 074, T-13).
 *
 * It gates connecting the first health device. That is the moment the product
 * starts collecting measurements and the patient starts assuming someone is
 * watching them — so it is the moment to be explicit that nobody is watching
 * continuously.
 *
 * Recorded in `ConsentLog` with the wording's version, because "they accepted"
 * is only meaningful with "they accepted *this text*".
 */

export async function GET() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accepted = await prisma.consentLog.findFirst({
    where: {
      patientId: effectiveUser.userId,
      action: "MONITORING_NOTICE_ACCEPTED",
      termsVersion: NON_EMERGENCY_NOTICE_VERSION,
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, termsVersion: true },
  });

  return NextResponse.json({
    accepted: !!accepted,
    acceptedAt: accepted?.createdAt ?? null,
    version: NON_EMERGENCY_NOTICE_VERSION,
  });
}

export async function POST(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (effectiveUser.isImpersonating) {
    // A therapist looking at a patient's screen must not be able to accept on
    // their behalf — this is the patient's statement, not the clinic's.
    return NextResponse.json({ error: "Read-only during impersonation" }, { status: 403 });
  }

  const log = await prisma.consentLog.create({
    data: {
      patientId: effectiveUser.userId,
      action: "MONITORING_NOTICE_ACCEPTED",
      termsVersion: NON_EMERGENCY_NOTICE_VERSION,
      // `ipAddress`, não `ip`: o modelo nomeia assim, e com o `as any` o erro
      // só apareceria em produção, no momento do aceite.
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent") || null,
      metadata: { where: "devices" },
    } as any,
    select: { createdAt: true },
  });

  return NextResponse.json({
    accepted: true,
    acceptedAt: log.createdAt,
    version: NON_EMERGENCY_NOTICE_VERSION,
  });
}
