import { prisma } from "@/lib/db";

/**
 * As sessões que o paciente comprou e ainda não usou.
 *
 * `PatientPackage.sessionsUsed` existia desde sempre e **ninguém incrementava**
 * — zero leitores e zero escritores em `app/`, `lib/` e `components/`. Um
 * pacote de dez sessões não limitava nada: o paciente podia marcar trinta e o
 * sistema não percebia.
 *
 * **A verdade são as consultas, não o contador.** Quem paga por uma consulta
 * fica gravado nela (`Appointment.patientPackageId`), e é dali que sai a conta.
 * Um contador solto não sabe qual consulta gastou qual sessão, então cancelar
 * não teria como devolver, e um erro de contagem não teria como ser auditado.
 * O contador continua sendo mantido em dia — para parar de mentir a quem o ler.
 */

/** Cancelada não gastou a sessão. Falta gastou: o horário foi perdido. */
const CONSOME = ["PENDING", "PENDING_PATIENT", "CONFIRMED", "COMPLETED", "NO_SHOW"];

export interface PackageBalance {
  patientPackageId: string;
  /** `null` quando o pacote é ilimitado. */
  included: number | null;
  used: number;
  /** `null` no ilimitado — sempre há sessão. */
  remaining: number | null;
  hasSession: boolean;
}

/**
 * O pacote de onde sai a próxima sessão, ou `null`.
 *
 * Vencido não serve, mesmo com sessões sobrando: o que o paciente comprou foi
 * um tratamento com prazo, e honrar a sessão depois do prazo é uma decisão da
 * clínica, tomada na mão, não um efeito silencioso da conta.
 */
export async function activePackageFor(
  patientId: string,
  clinicId: string
): Promise<PackageBalance | null> {
  const agora = new Date();

  const pacotes = await (prisma as any).patientPackage.findMany({
    where: {
      patientId,
      clinicId,
      paid: true,
      status: { in: ["PAID", "ACTIVE"] },
      OR: [{ endDate: null }, { endDate: { gte: agora } }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      package: { select: { sessionsIncluded: true } },
      appointments: {
        where: { status: { in: CONSOME } },
        select: { id: true },
      },
    },
  });

  for (const p of pacotes) {
    const included: number | null = p.package?.sessionsIncluded ?? null;
    const used = p.appointments.length;
    const remaining = included === null ? null : included - used;
    // Ilimitado sempre tem; limitado só enquanto sobra.
    if (included === null || remaining! > 0) {
      return { patientPackageId: p.id, included, used, remaining, hasSession: true };
    }
  }

  return null;
}

/**
 * Deixa o contador igual à realidade.
 *
 * Chamado depois de marcar e depois de cancelar. Não soma nem subtrai: conta de
 * novo, porque um `increment` erra para sempre no dia em que uma linha some por
 * fora — e neste sistema linhas somem por fora (a clínica apaga uma consulta).
 */
export async function syncSessionsUsed(patientPackageId: string): Promise<number> {
  const used = await prisma.appointment.count({
    where: { patientPackageId, status: { in: CONSOME as any } },
  });

  await (prisma as any).patientPackage.update({
    where: { id: patientPackageId },
    data: { sessionsUsed: used },
  });

  return used;
}
