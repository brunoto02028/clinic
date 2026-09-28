export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import { normalizeCode, validateCouponInput, limiteDoDia, type CouponScope } from "@/lib/coupon";

function falhou(rota: string, e: any) {
  // 500 sem corpo deixa a tela sem nada para dizer — e ela escrevia "nenhum
  // cupom" (F1/F2 do QA da T-2). A frase é genérica de propósito: detalhe de
  // banco não é assunto do navegador.
  console.error(`[admin/coupons ${rota}]`, e?.message);
  return NextResponse.json(
    { error: "Something went wrong saving that.", errorPt: "Algo deu errado ao salvar." },
    { status: 500 }
  );
}

/**
 * Editar, ligar/desligar e apagar um cupom (084, T-2).
 *
 * `PATCH` serve às duas coisas de propósito: o formulário inteiro e o
 * interruptor "Ativo" sozinho. O interruptor salvando na hora é uma correção
 * da tela de preços — lá ele só mudava o estado local e exigia um Save
 * separado, então o Bruno desligava e nada acontecia (26/09/2026).
 */

async function dono(request: NextRequest) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!actor.clinicId) return { response: NextResponse.json({ error: "No clinic" }, { status: 403 }) };
  if (actor.role !== "SUPERADMIN") {
    return {
      response: NextResponse.json(
        { error: "Only the clinic owner manages coupons", errorPt: "Só o dono da clínica administra cupons" },
        { status: 403 }
      ),
    };
  }
  return { actor: actor as typeof actor & { clinicId: string } };
}

async function auditar(
  userId: string,
  action: string,
  entityId: string,
  description: string,
  metadata: object
) {
  const quem = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  await logAudit({
    userId,
    userEmail: quem?.email ?? "",
    userRole: quem?.role ?? "",
    action,
    entity: "Coupon",
    entityId,
    description,
    metadata,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await dono(request);
    if ("response" in guard) return guard.response;
    const { clinicId, userId } = guard.actor;
  
    // Pelo tenant, sempre: um id de outra clínica responde como inexistente.
    const atual = await prisma.coupon.findFirst({ where: { id: params.id, clinicId } });
    if (!atual) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
    const body = await request.json().catch(() => ({}));
  
    // Só o interruptor: nada mais no corpo, nada mais validado. Exigir o
    // formulário completo para ligar um cupom seria pedir ao Bruno que reenviasse
    // dez campos para mexer em um.
    const soOInterruptor = Object.keys(body).length === 1 && typeof body.isActive === "boolean";
    if (soOInterruptor) {
      const cupom = await prisma.coupon.update({ where: { id: atual.id }, data: { isActive: body.isActive } });
      await auditar(
        userId,
        body.isActive ? "COUPON_ENABLED" : "COUPON_DISABLED",
        cupom.id,
        `${cupom.code} ${body.isActive ? "accepting again" : "no longer accepted"}`,
        { code: cupom.code, isActive: body.isActive }
      );
      return NextResponse.json({ coupon: cupom });
    }
  
    const erro = validateCouponInput({ ...atual, ...body });
    if (erro) return NextResponse.json({ error: erro.en, errorPt: erro.pt }, { status: 400 });
  
    const code = normalizeCode(body.code ?? atual.code);
    if (code !== atual.code) {
      const colide = await prisma.coupon.findUnique({ where: { clinicId_code: { clinicId, code } } });
      if (colide) {
        return NextResponse.json(
          { error: `The code ${code} already exists here.`, errorPt: `O código ${code} já existe aqui.` },
          { status: 409 }
        );
      }
    }
  
    let patientId: string | null | undefined;
    if ("patientId" in body) {
      if (!body.patientId) {
        patientId = null;
      } else {
        const alvo = await prisma.user.findFirst({
          where: { id: String(body.patientId), clinicId, role: "PATIENT" },
          select: { id: true },
        });
        if (!alvo) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        patientId = alvo.id;
      }
    }
  
    const cupom = await prisma.coupon.update({
      where: { id: atual.id },
      data: {
        code,
        description:
          "description" in body
            ? typeof body.description === "string"
              ? body.description.trim().slice(0, 300) || null
              : null
            : undefined,
        discountPercent: "discountPercent" in body ? (body.discountPercent ? Number(body.discountPercent) : null) : undefined,
        discountAmount: "discountAmount" in body ? (body.discountAmount ? Number(body.discountAmount) : null) : undefined,
        appliesTo: "appliesTo" in body ? ((body.appliesTo as CouponScope[]) ?? []) : undefined,
        patientId,
        startsAt: "startsAt" in body ? limiteDoDia(body.startsAt, "inicio") : undefined,
        endsAt: "endsAt" in body ? limiteDoDia(body.endsAt, "fim") : undefined,
        maxRedemptions:
          "maxRedemptions" in body
            ? body.maxRedemptions === null || body.maxRedemptions === ""
              ? null
              : Number(body.maxRedemptions)
            : undefined,
        maxPerPatient: "maxPerPatient" in body && body.maxPerPatient ? Number(body.maxPerPatient) : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
    });
  
    await auditar(userId, "COUPON_UPDATED", cupom.id, `${cupom.code} edited`, {
      code: cupom.code,
      was: { code: atual.code, discountPercent: atual.discountPercent, discountAmount: atual.discountAmount },
    });
  
    return NextResponse.json({ coupon: cupom });
  
  } catch (e: any) {
    return falhou("PATCH", e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await dono(request);
    if ("response" in guard) return guard.response;
    const { clinicId, userId } = guard.actor;
  
    const atual = await prisma.coupon.findFirst({ where: { id: params.id, clinicId } });
    if (!atual) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
    /**
     * Um cupom que já foi cobrado não se apaga.
     *
     * A linha do resgate é o registro de por que aquela pessoa pagou menos. Apagar
     * o cupom levaria a explicação junto, e seis meses depois haveria uma cobrança
     * de £80 numa consulta de £100 sem nada dizendo por quê. Então desativa.
     *
     * Resgate **não** confirmado não é histórico — é checkout abandonado, e sai
     * por cascade com o cupom.
     */
    const cobrados = await prisma.couponRedemption.count({
      where: { couponId: atual.id, confirmedAt: { not: null } },
    });
    if (cobrados > 0) {
      const cupom = await prisma.coupon.update({ where: { id: atual.id }, data: { isActive: false } });
      await auditar(userId, "COUPON_DISABLED", cupom.id, `${cupom.code} disabled instead of deleted (${cobrados} charged)`, {
        code: cupom.code,
        redemptions: cobrados,
      });
      return NextResponse.json({
        coupon: cupom,
        deactivated: true,
        message: `${cupom.code} has been used ${cobrados} time${cobrados === 1 ? "" : "s"}, so it was switched off instead of deleted — the record of those charges stays.`,
        messagePt: `${cupom.code} já foi usado ${cobrados} vez${cobrados === 1 ? "" : "es"}, então foi desligado em vez de apagado — o registro dessas cobranças fica.`,
      });
    }
  
    await prisma.coupon.delete({ where: { id: atual.id } });
    await auditar(userId, "COUPON_DELETED", atual.id, `${atual.code} deleted (never used)`, { code: atual.code });
    return NextResponse.json({ ok: true });
  
  } catch (e: any) {
    return falhou("DELETE", e);
  }
}
