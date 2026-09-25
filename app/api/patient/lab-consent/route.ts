export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { LAB_TESTS_CONSENT_VERSION, labConsentFor, hasLabConsent } from "@/lib/lab-consent";

/**
 * O paciente dizendo, uma vez, que leu o que um exame pelo app implica
 * (081, T-4). Gata o primeiro pedido; a rota do pedido recusa sem isto.
 *
 * `getEffectiveUser` aceita o bearer do app e a sessão da web, como as outras
 * rotas de consentimento.
 */
export async function GET(req: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locale = req.nextUrl.searchParams.get("locale");
  const { accepted, acceptedAt } = await hasLabConsent(user.userId);
  return NextResponse.json({ accepted, acceptedAt, version: LAB_TESTS_CONSENT_VERSION, text: labConsentFor(locale) });
}

export async function POST(req: NextRequest) {
  const user = await getEffectiveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isImpersonating) {
    // É a declaração do paciente, não da clínica: um terapeuta olhando a tela
    // dele não pode aceitar por ele.
    return NextResponse.json({ error: "Read-only during impersonation" }, { status: 403 });
  }

  const log = await prisma.consentLog.create({
    data: {
      patientId: user.userId,
      action: "LAB_TESTS_CONSENT_ACCEPTED",
      termsVersion: LAB_TESTS_CONSENT_VERSION,
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      userAgent: req.headers.get("user-agent") || null,
      metadata: { where: "labs" },
    },
    select: { createdAt: true },
  });

  return NextResponse.json({ accepted: true, acceptedAt: log.createdAt, version: LAB_TESTS_CONSENT_VERSION });
}
