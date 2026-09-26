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
 * Os cupons da clínica (084, T-2).
 *
 * Self-service de propósito: o Bruno cria, edita e desliga uma campanha pela
 * tela, sem depender de mim rodando script nenhum. Foi o pedido dele quando o
 * idioma de um paciente precisou ser trocado por API.
 *
 * Tenant pelo actor, nunca por header nem por `session.user.clinicId` — foi
 * assim que as notas SOAP vazaram (1b4109a5).
 */

/** Só o dono da plataforma precifica, como na exceção de preço da 082 (F1 do QA). */
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

/**
 * Quantos resgates cada cupom teve.
 *
 * Confirmados e não confirmados, separados: o limite conta só os confirmados
 * (084, T-1), mas a tela precisa mostrar os dois — um cupom com trinta
 * checkouts abandonados e nenhuma cobrança diz algo sobre a campanha.
 */
async function contarResgates(couponIds: string[]) {
  if (couponIds.length === 0) return new Map<string, { confirmed: number; started: number }>();
  const linhas = await prisma.couponRedemption.findMany({
    where: { couponId: { in: couponIds } },
    select: { couponId: true, confirmedAt: true },
  });
  const mapa = new Map<string, { confirmed: number; started: number }>();
  for (const id of couponIds) mapa.set(id, { confirmed: 0, started: 0 });
  for (const l of linhas) {
    const atual = mapa.get(l.couponId)!;
    atual.started += 1;
    if (l.confirmedAt) atual.confirmed += 1;
  }
  return mapa;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await dono(request);
    if ("response" in guard) return guard.response;
    const { clinicId } = guard.actor;
  
    const cupons = await prisma.coupon.findMany({
      where: { clinicId },
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    const contagem = await contarResgates(cupons.map((c) => c.id));
  
    return NextResponse.json({
      coupons: cupons.map((c) => ({
        ...c,
        redemptions: contagem.get(c.id) ?? { confirmed: 0, started: 0 },
      })),
    });
  
  } catch (e: any) {
    return falhou("GET", e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await dono(request);
    if ("response" in guard) return guard.response;
    const { clinicId, userId } = guard.actor;
  
    const body = await request.json().catch(() => ({}));
    const erro = validateCouponInput(body);
    if (erro) return NextResponse.json({ error: erro.en, errorPt: erro.pt }, { status: 400 });
  
    const code = normalizeCode(body.code);
  
    // Mirar num paciente é mirar num paciente **desta** clínica. Um id de fora
    // responde como inexistente, nunca como "existe mas não é seu".
    let patientId: string | null = null;
    if (body.patientId) {
      const alvo = await prisma.user.findFirst({
        where: { id: String(body.patientId), clinicId, role: "PATIENT" },
        select: { id: true },
      });
      if (!alvo) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      patientId = alvo.id;
    }
  
    // Find-then-write, e não `create` esperando o erro do índice: a frase de
    // "esse código já existe" é da tela, não do Postgres.
    const existente = await prisma.coupon.findUnique({ where: { clinicId_code: { clinicId, code } } });
    if (existente) {
      return NextResponse.json(
        { error: `The code ${code} already exists here.`, errorPt: `O código ${code} já existe aqui.` },
        { status: 409 }
      );
    }
  
    const cupom = await prisma.coupon.create({
      data: {
        clinicId,
        code,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 300) || null : null,
        discountPercent: body.discountPercent ? Number(body.discountPercent) : null,
        discountAmount: body.discountAmount ? Number(body.discountAmount) : null,
        currency: typeof body.currency === "string" && body.currency ? body.currency.toUpperCase() : "GBP",
        appliesTo: (body.appliesTo as CouponScope[]) ?? [],
        patientId,
        // Fim do dia para o fim da janela: "até 30/09" inclui o dia 30.
        startsAt: limiteDoDia(body.startsAt, "inicio"),
        endsAt: limiteDoDia(body.endsAt, "fim"),
        maxRedemptions:
          body.maxRedemptions === null || body.maxRedemptions === undefined || body.maxRedemptions === ""
            ? null
            : Number(body.maxRedemptions),
        maxPerPatient: body.maxPerPatient ? Number(body.maxPerPatient) : 1,
        isActive: body.isActive !== false,
        createdById: userId,
      },
    });
  
    const quem = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, role: true, firstName: true, lastName: true },
    });
    await logAudit({
      userId,
      userEmail: quem?.email ?? "",
      userRole: quem?.role ?? "",
      userName: quem ? `${quem.firstName} ${quem.lastName}`.trim() : undefined,
      action: "COUPON_CREATED",
      entity: "Coupon",
      entityId: cupom.id,
      description: `${code}: ${
        cupom.discountPercent !== null ? `${cupom.discountPercent}%` : `${cupom.currency} ${cupom.discountAmount}`
      } on ${cupom.appliesTo.join(", ")}${patientId ? " (one patient)" : ""}`,
      // `clinicId` no registro porque o SUPERADMIN troca de clínica pela sidebar:
    // sem ele o log não diz em qual delas o SPRING20 nasceu (F5 do QA da T-2).
    metadata: { clinicId, code, appliesTo: cupom.appliesTo, patientId },
    });
  
    return NextResponse.json({ coupon: cupom });
  
  } catch (e: any) {
    return falhou("POST", e);
  }
}
