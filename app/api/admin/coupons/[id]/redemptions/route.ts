export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

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
 * Quem usou este cupom (084, T-2).
 *
 * Uma campanha sem esta tela é um desconto que ninguém sabe medir: quantas
 * pessoas pegaram, quanto desceu no total, e quantos checkouts foram abertos e
 * abandonados — que é a diferença entre "o cupom não pega" e "a tela não
 * converte".
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getSessionStaffActor(request);
    if (!actor || !actor.clinicId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (actor.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  
    // O cupom pelo tenant primeiro: sem isto, um id de outra clínica devolveria
    // os resgates dela.
    const cupom = await prisma.coupon.findFirst({
      where: { id: params.id, clinicId: actor.clinicId },
      select: { id: true, code: true, currency: true },
    });
    if (!cupom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  
    const resgates = await prisma.couponRedemption.findMany({
      where: { couponId: cupom.id },
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  
    const confirmados = resgates.filter((r) => r.confirmedAt);
    return NextResponse.json({
      coupon: cupom,
      redemptions: resgates,
      totals: {
        confirmed: confirmados.length,
        abandoned: resgates.length - confirmados.length,
        discountGiven: Math.round(confirmados.reduce((s, r) => s + r.discountAmount, 0) * 100) / 100,
      },
    });
  
  } catch (e: any) {
    return falhou("GET", e);
  }
}
