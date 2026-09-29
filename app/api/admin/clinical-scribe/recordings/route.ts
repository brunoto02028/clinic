import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

/**
 * As gravações de consulta, **do meu inquilino** (102 T-10).
 *
 * ## O que estava aberto
 *
 * As duas pontas. O `GET` montava o `where` com `status`, `patientId` e
 * `appointmentId` vindos da query e **nada mais**: um admin de qualquer
 * inquilino pedia `?patientId=<id de outra clínica>` e recebia as gravações,
 * com o nome da pessoa. O `PATCH` atualizava `where: { id }` — o id sozinho —
 * então dava para marcar como revisada a gravação de outra casa.
 *
 * É a forma exata dos dois vazamentos de 28/09/2026 e do incidente de 11/09: **o
 * id vem de fora, o inquilino vem da sessão, e ninguém verifica que combinam.**
 *
 * ## Por que o filtro tem duas metades
 *
 * `clinicId` é opcional neste modelo — as linhas gravadas antes de o campo
 * existir têm nulo. Descartá-las esconderia gravações legítimas; aceitá-las sem
 * conferir manteria o buraco aberto. Então as nulas são resolvidas pelo
 * inquilino **do paciente**, na consulta que esta rota já fazia para achar os
 * nomes.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "all";
  const patientId = searchParams.get("patientId");
  const appointmentId = searchParams.get("appointmentId");

  const where: any = {
    // As minhas, mais as antigas sem inquilino — filtradas pelo paciente abaixo.
    OR: [{ clinicId: actor.clinicId }, { clinicId: null }],
  };
  if (status !== "all") where.status = status;
  if (patientId) where.patientId = patientId;
  if (appointmentId) where.appointmentId = appointmentId;

  const recordings = await prisma.consultationRecording.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const patientIds = [...new Set(recordings.map((r: any) => r.patientId))];
  const patients = await prisma.user.findMany({
    where: { id: { in: patientIds } },
    // `User` nao tem `name` — tem `firstName` e `lastName`. O Prisma lanca em
    // `select` com campo inexistente, entao esta listagem quebrava inteira.
    // `clinicId` entrou em 29/09/2026: e ele que resolve as gravacoes antigas.
    select: { id: true, firstName: true, lastName: true, clinicId: true },
  });
  const doMeuInquilino = new Set(
    patients.filter((p) => p.clinicId === actor.clinicId).map((p) => p.id)
  );
  const patientMap = Object.fromEntries(
    patients.map((p) => [p.id, [p.firstName, p.lastName].filter(Boolean).join(" ")])
  );

  const enriched = recordings
    .filter((r: any) => r.clinicId === actor.clinicId || doMeuInquilino.has(r.patientId))
    .map((r: any) => ({
      ...r,
      patientName: patientMap[r.patientId] || "Unknown",
      audioUrl: undefined, // Don't send full audio in list (too large)
    }));

  return NextResponse.json({ recordings: enriched });
}

/**
 * Marcar como revisada — **a minha**, e não a que o id apontar.
 *
 * Responde 404 quando não é do inquilino, e não 403: dizer "existe, mas não é
 * sua" conta a um estranho que aquela gravação existe.
 */
export async function PATCH(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const atual = await prisma.consultationRecording.findUnique({
    where: { id },
    select: { id: true, clinicId: true, patientId: true },
  });
  if (!atual) return NextResponse.json({ error: "Recording not found" }, { status: 404 });

  let daMinhaCasa = atual.clinicId === actor.clinicId;
  if (!daMinhaCasa && atual.clinicId === null) {
    // A mesma resolução do `GET`, para as linhas anteriores ao campo.
    const dono = await prisma.user.findUnique({
      where: { id: atual.patientId },
      select: { clinicId: true },
    });
    daMinhaCasa = dono?.clinicId === actor.clinicId;
  }
  if (!daMinhaCasa) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 });
  }

  const recording = await prisma.consultationRecording.update({
    where: { id },
    data: {
      status,
      reviewedBy: actor.userId,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ recording });
}
