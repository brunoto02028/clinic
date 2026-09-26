export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import { servicePricesForClinic } from "@/lib/service-price";

/**
 * A exceção de preço de um paciente (082).
 *
 * "Para quem isto vale?" é a pergunta da atividade: o preço do serviço vale
 * para a clínica toda; esta rota é como uma pessoa paga diferente — com motivo
 * escrito, porque daqui a seis meses ninguém lembra por quê.
 *
 * Tenant pelo actor, nunca por header nem por `session.user.clinicId`: foi
 * assim que as notas SOAP vazaram.
 */

const TIPOS = ["CONSULTATION", "TREATMENT_SESSION", "FOOT_SCAN", "BODY_ASSESSMENT"] as const;

async function staff(request: NextRequest) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (!actor.clinicId) return { response: NextResponse.json({ error: "No clinic" }, { status: 403 }) };
  return { actor: actor as typeof actor & { clinicId: string } };
}

/** Um paciente da clínica do actor, ou nada — id de fora responde como inexistente. */
async function patientOf(clinicId: string, patientId: string) {
  return prisma.user.findFirst({
    where: { id: patientId, clinicId, role: "PATIENT" },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
}

export async function GET(request: NextRequest) {
  const guard = await staff(request);
  if ("response" in guard) return guard.response;
  const { clinicId } = guard.actor;

  const patientId = request.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    // Sem paciente: quem tem exceção hoje, para a clínica ver de relance.
    const rows = await prisma.patientServicePrice.findMany({
      where: { clinicId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ exceptions: rows });
  }

  const patient = await patientOf(clinicId, patientId);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [clinicPrices, exceptions] = await Promise.all([
    servicePricesForClinic(clinicId),
    prisma.patientServicePrice.findMany({ where: { clinicId, patientId } }),
  ]);
  const porTipo = new Map(exceptions.map((e) => [e.serviceType as string, e]));

  // Os quatro serviços, cada um com o preço da clínica e a exceção — a tela
  // precisa mostrar o de onde ela sai, senão "£80" não diz se é regra ou troco.
  return NextResponse.json({
    patient,
    services: TIPOS.map((t) => {
      const base = clinicPrices.find((p) => p.serviceType === t) ?? null;
      const ex = porTipo.get(t) ?? null;
      return {
        serviceType: t,
        name: base?.name ?? t,
        clinicPrice: base?.price ?? null,
        currency: base?.currency ?? "GBP",
        exception: ex ? { id: ex.id, price: ex.price, currency: ex.currency, note: ex.note } : null,
        effective: ex ? ex.price : base?.price ?? null,
      };
    }),
  });
}

export async function PUT(request: NextRequest) {
  const guard = await staff(request);
  if ("response" in guard) return guard.response;
  const { clinicId, userId, role } = guard.actor;
  if (role !== "SUPERADMIN" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only the clinic owner sets prices", errorPt: "Só o dono da clínica define preços" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { patientId, serviceType } = body ?? {};
  if (!patientId || !TIPOS.includes(serviceType)) {
    return NextResponse.json({ error: "patientId and a known serviceType are required" }, { status: 400 });
  }
  const price = Number(body.price);
  // Zero vale: é cortesia registrada. Negativo e não-número, não.
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Price must be zero or more", errorPt: "O preço precisa ser zero ou mais" }, { status: 400 });
  }

  const patient = await patientOf(clinicId, patientId);
  if (!patient) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;
  const rounded = Math.round(price * 100) / 100;

  // `upsert` na chave composta é seguro aqui (nenhum campo dela é nulo) — mas
  // find-then-write é o que o resto deste código faz desde a F2 da 080.
  const existing = await prisma.patientServicePrice.findUnique({
    where: { patientId_serviceType: { patientId, serviceType } },
  });
  const row = existing
    ? await prisma.patientServicePrice.update({ where: { id: existing.id }, data: { price: rounded, note } })
    : await prisma.patientServicePrice.create({
        data: { clinicId, patientId, serviceType, price: rounded, note, createdById: userId },
      });

  const who = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true, firstName: true, lastName: true } });
  await logAudit({
    userId,
    userEmail: who?.email ?? "",
    userRole: who?.role ?? "",
    userName: who ? `${who.firstName} ${who.lastName}`.trim() : undefined,
    action: "PATIENT_PRICE_SET",
    entity: "PatientServicePrice",
    entityId: row.id,
    description: `${patient.firstName} ${patient.lastName}: ${serviceType} at ${row.currency} ${rounded}${note ? ` — ${note}` : ""}`,
    metadata: { patientId, serviceType, price: rounded, previous: existing?.price ?? null },
  });

  return NextResponse.json({ exception: row });
}

export async function DELETE(request: NextRequest) {
  const guard = await staff(request);
  if ("response" in guard) return guard.response;
  const { clinicId, userId, role } = guard.actor;
  if (role !== "SUPERADMIN" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only the clinic owner sets prices" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Pelo tenant, sempre: um id de outra clínica responde como inexistente.
  const row = await prisma.patientServicePrice.findFirst({ where: { id, clinicId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.patientServicePrice.delete({ where: { id } });
  const who = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true } });
  await logAudit({
    userId,
    userEmail: who?.email ?? "",
    userRole: who?.role ?? "",
    action: "PATIENT_PRICE_REMOVED",
    entity: "PatientServicePrice",
    entityId: id,
    description: `exception removed — the patient goes back to the clinic price for ${row.serviceType}`,
    metadata: { patientId: row.patientId, serviceType: row.serviceType, was: row.price },
  });

  return NextResponse.json({ ok: true });
}
