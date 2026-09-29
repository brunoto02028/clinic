import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, isStaff } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

/**
 * Os últimos planos de reabilitação — **do meu inquilino** (102 T-10).
 *
 * ## O que estava aberto
 *
 * O comentário desta rota dizia, literalmente, *"last 20 plans across all
 * patients"* — e era verdade: `findMany` sem filtro nenhum, com o nome e o
 * sobrenome do paciente e o `chiefComplaint` no `select`. Qualquer terapeuta ou
 * admin de **qualquer** clínica abria o painel e lia a queixa principal dos
 * últimos vinte planos da plataforma inteira.
 *
 * ## Por que o filtro passa pelo paciente
 *
 * `RehabPlan` não tem `clinicId` — só `patientId`. O inquilino do plano é o
 * inquilino de quem ele trata, então é por ali que se filtra. Acrescentar o
 * campo ao modelo seria melhor, e é mudança de esquema para outra frente: o
 * filtro pelo paciente fecha a porta hoje, com o que existe.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStaff(actor)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic context" }, { status: 400 });

  const plans = await (prisma as any).rehabPlan.findMany({
    where: { patient: { clinicId: actor.clinicId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      patientId: true,
      chiefComplaint: true,
      bodyPart: true,
      severity: true,
      phase: true,
      status: true,
      createdAt: true,
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return NextResponse.json(plans);
}
