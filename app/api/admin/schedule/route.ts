import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, requireStaff, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { overlaps } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/**
 * A agenda que a clínica monta — e que o app do paciente reflete.
 *
 * As regras são dados: quantas janelas por dia, o que cada uma atende, quantos
 * cabem, de quanto em quanto abre horário. Nada disso é decidido em código, e
 * mudar não precisa de deploy.
 *
 * O que **é** código, porque não é preferência: duas janelas não podem se
 * sobrepor. Consulta e tratamento disputam a mesma sala e a mesma pessoa, e
 * deixar as duas na mesma faixa não daria erro na tela — daria erro na
 * terça-feira, com gente na porta.
 */

const DIAS = [0, 1, 2, 3, 4, 5, 6];
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function invalido(body: any): string | null {
  if (!DIAS.includes(Number(body?.dayOfWeek))) return "dayOfWeek must be 0–6";
  if (!HORA.test(String(body?.startTime))) return "startTime must be HH:MM";
  if (!HORA.test(String(body?.endTime))) return "endTime must be HH:MM";
  if (String(body.startTime) >= String(body.endTime)) return "endTime must be after startTime";
  if (!["CONSULTATION", "TREATMENT"].includes(String(body?.kind))) return "kind must be CONSULTATION or TREATMENT";
  const cap = Number(body?.capacity ?? 1);
  if (!Number.isInteger(cap) || cap < 1 || cap > 5) return "capacity must be 1–5";
  const passo = Number(body?.slotMinutes ?? 60);
  if (![15, 20, 30, 45, 60, 90].includes(passo)) return "slotMinutes must be 15, 20, 30, 45, 60 or 90";
  return null;
}

// GET — a semana como está hoje, mais as exceções à frente.
export async function GET(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const therapistId = req.nextUrl.searchParams.get("therapistId") || actor.userId;

    const [windows, exceptions] = await Promise.all([
      (prisma as any).scheduleWindow.findMany({
        where: { clinicId, therapistId },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      (prisma as any).scheduleException.findMany({
        where: { clinicId, date: { gte: new Date().toISOString().slice(0, 10) } },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({ windows, exceptions });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — uma janela nova.
export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);
    if (!clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const erro = invalido(body);
    if (erro) return NextResponse.json({ error: erro, code: "invalid_window" }, { status: 400 });

    const therapistId = body.therapistId || actor.userId;

    // O terapeiro nomeado tem de ser desta clínica — senão a janela nasceria
    // na agenda de outro tenant.
    const dono = await prisma.user.findFirst({
      where: { id: therapistId, clinicId },
      select: { id: true },
    });
    if (!dono) return NextResponse.json({ error: "Therapist not found" }, { status: 404 });

    const doDia = await (prisma as any).scheduleWindow.findMany({
      where: { clinicId, therapistId, dayOfWeek: Number(body.dayOfWeek), isActive: true },
      select: { id: true, startTime: true, endTime: true },
    });

    const conflito = doDia.find((j: any) => overlaps(j, body));
    if (conflito) {
      return NextResponse.json(
        {
          error: `That overlaps the window from ${conflito.startTime} to ${conflito.endTime}.`,
          errorPt: `Isso se sobrepõe à janela das ${conflito.startTime} às ${conflito.endTime}.`,
          code: "overlap",
        },
        { status: 409 }
      );
    }

    const window = await (prisma as any).scheduleWindow.create({
      data: {
        clinicId,
        therapistId,
        dayOfWeek: Number(body.dayOfWeek),
        startTime: body.startTime,
        endTime: body.endTime,
        kind: body.kind,
        capacity: Number(body.capacity ?? 1),
        slotMinutes: Number(body.slotMinutes ?? 60),
      },
    });

    return NextResponse.json({ window }, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/schedule] POST", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — tira uma janela da semana.
export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // O `clinicId` no `where` é o que impede apagar a janela de outra clínica:
    // um id de fora simplesmente não encontra nada.
    const r = await (prisma as any).scheduleWindow.deleteMany({ where: { id, clinicId } });
    if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
