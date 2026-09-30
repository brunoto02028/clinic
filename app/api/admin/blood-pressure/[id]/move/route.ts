export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { logAudit } from "@/lib/system-logger";
import { NOTA_DA_ATRIBUICAO_AUTOMATICA } from "@/lib/clinic-device";

/**
 * Mover uma leitura de pressão para outro prontuário (114 T-5).
 *
 * É a metade que torna a regra nova defensável. Sem ela, uma leitura arquivada
 * no prontuário errado ficava lá para sempre — e **é por isso que a regra "sem
 * sessão vai para o dono" não valia a pena antes**: ela erra quando alguém mede
 * um paciente e esquece de abrir a janela, e um erro clínico irreversível não se
 * compensa com comodidade.
 *
 * ## O que esta rota não faz
 *
 * **Não apaga.** Mover é mudar de dono, e a leitura continua a existir com o seu
 * horário, os seus números e o `withingsMeasureId` que a liga à medição real. Um
 * "apagar e criar de novo" perderia o rasto e faria a deduplicação da próxima
 * sincronia trazer a mesma medida de volta.
 *
 * **Não decide.** Quem diz de quem é a leitura é a pessoa, como em toda a
 * família de `clinic-device.ts`. Isto só escreve o que ela disse.
 *
 * ## As duas guardas, e são diferentes
 *
 * `staffPatientAccess` sobre o **paciente de destino** — é a mesma da caixa de
 * entrada, e é o que impede arquivar numa ficha de outra clínica mesmo tendo o
 * id. E a leitura de origem tem de ser da clínica de quem move: sem essa
 * segunda, um id adivinhado deixaria mexer numa leitura alheia.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const patientId = typeof body?.patientId === "string" ? body.patientId : "";
  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }

  const guard = await staffPatientAccess(req, patientId);
  if (guard.response) return guard.response;
  const clinicId = guard.actor.clinicId;

  const leitura = await (prisma as any).bloodPressureReading.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      clinicId: true,
      patientId: true,
      systolic: true,
      diastolic: true,
      measuredAt: true,
      autoAttributed: true,
      notes: true,
      withingsMeasureId: true,
    },
  });
  if (!leitura || !clinicId || leitura.clinicId !== clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (leitura.patientId === patientId) {
    // Não é erro, e dizer que foi seria pior: quem clicou queria este estado, e
    // ele já é o actual.
    return NextResponse.json({ ok: true, moved: false });
  }

  /**
   * A mesma medida não pode existir duas vezes no mesmo prontuário.
   *
   * `@@unique([patientId, withingsMeasureId])` garante isso no banco, mas um
   * 500 cru não diz ao terapeuta o que aconteceu — e o que aconteceu costuma
   * ser inocente: a leitura já tinha sido atribuída àquela pessoa noutro dia.
   */
  if (leitura.withingsMeasureId) {
    const jaLa = await (prisma as any).bloodPressureReading.findFirst({
      where: {
        patientId,
        withingsMeasureId: leitura.withingsMeasureId,
        id: { not: leitura.id },
      },
      select: { id: true },
    });
    if (jaLa) {
      return NextResponse.json(
        {
          error: "That patient already has this measurement",
          errorPt: "Esse paciente já tem essa medição",
        },
        { status: 409 }
      );
    }
  }

  await (prisma as any).bloodPressureReading.update({
    where: { id: leitura.id },
    data: {
      patientId,
      // Deixa de ser automática no momento em que uma pessoa decide. O campo
      // existe para marcar *"ninguém disse de quem era"*, e agora alguém disse.
      autoAttributed: false,
      /**
       * **Só a nota que a regra escreveu** (114, segundo achado do QA).
       *
       * A primeira correção condicionou a limpeza ao **estado da leitura** —
       * `leitura.autoAttributed ? { notes: null } : {}` — e isso apagava
       * qualquer nota que estivesse ali. O campo `notes` de uma leitura
       * auto-atribuída **não é propriedade da regra**: a ficha oferece o lápis
       * em todas as linhas, e o botão de mover aparece exatamente nelas. Dois
       * cliques do produto e a observação de uma terapeuta desaparecia, sem
       * aviso e sem desfazer.
       *
       * Pior: o comentário que eu tinha escrito ali prometia, palavra por
       * palavra, o contrário do que o código fazia.
       *
       * Agora a condição é sobre **o texto**, e o texto é uma constante
       * partilhada com quem o escreve. A frase errada sai; o que uma pessoa
       * escreveu fica.
       */
      ...(leitura.notes === NOTA_DA_ATRIBUICAO_AUTOMATICA ? { notes: null } : {}),
      recordedById: guard.actor.userId,
    },
  });

  await logAudit({
    userId: guard.actor.userId,
    userEmail: "",
    userRole: guard.actor.role,
    action: "BP_READING_MOVED",
    entity: "BloodPressureReading",
    entityId: leitura.id,
    description: `Reading ${leitura.systolic}/${leitura.diastolic} moved to another patient`,
    metadata: {
      from: leitura.patientId,
      to: patientId,
      wasAutoAttributed: leitura.autoAttributed === true,
      measuredAt: leitura.measuredAt,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, moved: true });
}
