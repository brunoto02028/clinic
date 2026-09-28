export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/tenant-access";
import { patientGate } from "@/lib/patient-gate";
import { applyCoupon, type CouponScope } from "@/lib/coupon";
import { servicePricesForPatient } from "@/lib/service-price";
import { precoDoPacote } from "@/lib/package-price";

/**
 * Quanto ficaria com este cupom (084, T-3).
 *
 * É **prévia**: não grava resgate nenhum. Quem digita um código três vezes para
 * ver o número não pode gastar a campanha, e quem desiste depois de olhar não
 * deixa rastro. Gravar é da T-4, no checkout, e lá o valor é recalculado — a
 * prévia não autoriza nada.
 *
 * **O valor vem do servidor, nunca do corpo do pedido.** Aceitar um `amount` do
 * app seria deixar alguém pedir 20% de £10.000 e receber a conta pronta para
 * exibir. A tela informa *o que* está comprando; quanto custa é resposta daqui —
 * a mesma regra que fez `servicePricesForPatient` existir (082).
 */

const ESCOPOS: CouponScope[] = [
  "CONSULTATION",
  "TREATMENT_SESSION",
  "PACKAGE",
  "TREATMENT_PLAN",
  "MEMBERSHIP",
];

/** O preço cheio do que está sendo comprado, resolvido aqui. */
async function valorDe(
  scope: CouponScope,
  clinicId: string,
  patientId: string,
  alvoId: string | null
): Promise<{ amount: number; currency: string } | { erro: string; erroPt: string }> {
  if (scope === "CONSULTATION" || scope === "TREATMENT_SESSION") {
    const precos = await servicePricesForPatient(clinicId, patientId);
    const p = precos.find((x) => x.serviceType === scope);
    // `null` aqui é a clínica não ter precificado — e é o caso que virava £60
    // inventados antes da 082. Sem preço não há desconto a calcular.
    if (!p) {
      return {
        erro: "Your clinic has not set a price for this yet.",
        erroPt: "Sua clínica ainda não definiu um preço para isto.",
      };
    }
    return { amount: p.price, currency: p.currency };
  }

  if (scope === "MEMBERSHIP") {
    if (!alvoId) return { erro: "Which plan?", erroPt: "Qual plano?" };
    // O plano tem de ser um dos oferecidos a **este** paciente — a mesma
    // filtragem de `/api/patient/membership/plans` (atividade 52, T-6).
    const plano = await (prisma as any).membershipPlan.findFirst({
      where: {
        id: alvoId,
        status: "ACTIVE",
        clinicId,
        OR: [{ patientScope: "all" }, { patientScope: "specific", patientId }],
      },
      select: { price: true, isFree: true },
    });
    if (!plano) return { erro: "Plan not found.", erroPt: "Plano não encontrado." };
    if (plano.isFree || plano.price === 0) {
      return { erro: "That plan is already included.", erroPt: "Esse plano já está incluído." };
    }
    return { amount: plano.price, currency: "GBP" };
  }

  if (scope === "PACKAGE") {
    if (!alvoId) return { erro: "Which package?", erroPt: "Qual pacote?" };
    /**
     * `TreatmentPackage`, e não `ServicePackage`.
     *
     * Era o modelo errado: `ServicePackage` é o catálogo da clínica, comprado
     * pela rota do admin; o que **este** paciente paga em
     * `/api/patient/packages/checkout` é um `TreatmentPackage` dele. A prévia
     * olhando um e o checkout cobrando o outro seria a N4 da 080 outra vez.
     */
    const pacote = await (prisma as any).treatmentPackage.findFirst({
      where: { id: alvoId, patientId, clinicId },
      include: { protocol: { select: { estimatedWeeks: true } } },
    });
    if (!pacote) return { erro: "Package not found.", erroPt: "Pacote não encontrado." };
    if (pacote.isPaid) return { erro: "That is already paid.", erroPt: "Isso já está pago." };
    // A mesma função que o checkout usa — uma conta, um lugar.
    const preco = precoDoPacote(pacote);
    return { amount: preco.amount, currency: preco.currency };
  }

  // TREATMENT_PLAN
  if (!alvoId) return { erro: "Which plan?", erroPt: "Qual plano?" };
  const plano = await (prisma as any).treatmentPlan.findFirst({
    where: { id: alvoId, patientId, clinicId },
    select: { totalPrice: true, isFree: true },
  });
  if (!plano || plano.totalPrice == null) {
    return { erro: "Plan not found.", erroPt: "Plano não encontrado." };
  }
  if (plano.isFree || plano.totalPrice === 0) {
    return { erro: "That plan is free.", erroPt: "Esse plano é gratuito." };
  }
  return { amount: plano.totalPrice, currency: "GBP" };
}

export async function POST(request: NextRequest) {
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.clinicId) {
      return NextResponse.json(
        { ok: false, error: "This account is not linked to a clinic.", errorPt: "Esta conta não está ligada a uma clínica." },
        { status: 200 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const scope = body?.scope as CouponScope;
    if (!ESCOPOS.includes(scope)) {
      // Inclui o exame: `LAB_TEST` não existe em `CouponScope`, então um pedido
      // com ele cai aqui e nunca chega ao cálculo.
      return NextResponse.json({ error: "Unknown scope" }, { status: 400 });
    }

    const valor = await valorDe(scope, actor.clinicId, actor.userId, body?.targetId ?? null);
    if ("erro" in valor) {
      return NextResponse.json({ ok: false, error: valor.erro, errorPt: valor.erroPt }, { status: 200 });
    }

    const r = await applyCoupon({
      clinicId: actor.clinicId,
      patientId: actor.userId,
      code: String(body?.code ?? ""),
      scope,
      amount: valor.amount,
      // A moeda da compra, para um cupom de valor fixo não descontar 15 de
      // outra moeda (achado F3 do QA da T-1).
      currency: valor.currency,
    });

    // Recusa não é erro de servidor: a tela precisa ler o motivo e mostrá-lo.
    // Devolver 400 faria o cliente tratar como falha e escrever "erro" na tela,
    // que é exatamente o que a F2 da 082 fez com quem não tinha preço.
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, reason: r.reason, error: r.message, errorPt: r.messagePt },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      code: r.code,
      campaign: r.name,
      currency: valor.currency,
      original: r.original,
      discount: r.discount,
      final: r.final,
    });
  } catch (error: any) {
    console.error("[patient/coupons/preview]", error?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
