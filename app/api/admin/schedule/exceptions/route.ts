import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, requireStaff, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

/**
 * O dia que foge da semana.
 *
 * Feriado, férias, ou um expediente mais curto. Sem isto a agenda é puramente
 * semanal e repetida — e a primeira vez que a clínica fecha mais cedo, alguém
 * marca num horário que não existe.
 *
 * Fechar o dia apaga as janelas dele; encurtar **apara** as janelas em vez de
 * apagá-las, porque "hoje só até as 15h" continua sendo a semana normal, mais
 * curta.
 */

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);
    if (!clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (!DATA.test(String(body?.date))) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    const closed = body?.closed === true;
    if (!closed) {
      // Não fechado e sem horário nenhum seria uma exceção que não excetua nada.
      if (!HORA.test(String(body?.startTime || "")) && !HORA.test(String(body?.endTime || ""))) {
        return NextResponse.json(
          {
            error: "Either close the day or give a start or end time.",
            errorPt: "Ou feche o dia, ou informe um horário de início ou de fim.",
          },
          { status: 400 }
        );
      }
    }

    // `therapistId: null` vale para a clínica toda — é o feriado. Com id, é a
    // folga de uma pessoa, e vence a da clínica na hora de resolver o dia.
    const therapistId = body?.therapistId || null;

    // A rota irmã das janelas já validava o dono; esta não, e aceitava o id de
    // um terapeuta de outra clínica (QA de 25/09, N7).
    if (therapistId) {
      const dono = await prisma.user.findFirst({
        where: { id: therapistId, clinicId },
        select: { id: true },
      });
      if (!dono) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    const dados = {
      closed,
      startTime: closed ? null : body.startTime || null,
      endTime: closed ? null : body.endTime || null,
      note: body.note || null,
    };

    // `upsert` na chave composta não serve aqui: o Prisma recusa nulo em chave
    // única, e nulo é justamente o caso principal — o feriado, que vale para a
    // clínica toda. A tela nunca conseguiu salvar uma exceção sequer
    // (QA de 25/09, falha 2).
    const existente = await (prisma as any).scheduleException.findFirst({
      where: { clinicId, therapistId, date: body.date },
      select: { id: true },
    });

    const exception = existente
      ? await (prisma as any).scheduleException.update({ where: { id: existente.id }, data: dados })
      : await (prisma as any).scheduleException.create({
          data: { clinicId, therapistId, date: body.date, ...dados },
        });

    return NextResponse.json({ exception }, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/schedule/exceptions] POST", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const r = await (prisma as any).scheduleException.deleteMany({ where: { id, clinicId } });
    if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
