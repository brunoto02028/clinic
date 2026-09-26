import { prisma } from "@/lib/db";

/**
 * O que morre junto com uma clínica.
 *
 * `User.clinicId` tem `onDelete: Cascade`, e mais noventa e cinco tabelas
 * fazem o mesmo. Apagar uma clínica não é apagar uma linha — é apagar todo
 * paciente dela, todo prontuário, toda consulta, todo resultado de exame, sem
 * aviso e sem volta.
 *
 * O botão "Delete Clinic" existia na tela **sem `onClick`**, e a rota existia
 * sem nenhuma verificação. Ninguém nunca apagou uma clínica por ali, e foi só
 * por isso que nada se perdeu.
 *
 * Isto conta antes. Não para impedir — a clínica é do Bruno e ele decide —,
 * mas para que a decisão seja tomada com o número na frente.
 */

export interface ConteudoDaClinica {
  id: string;
  name: string;
  slug: string;
  pacientes: number;
  equipe: number;
  consultas: number;
  notasClinicas: number;
  pedidosDeExame: number;
  videosDeExercicio: number;
  mensagens: number;
  /** A soma do que importa: zero significa que dá para apagar sem perder nada. */
  total: number;
}

export async function conteudoDaClinica(clinicId: string): Promise<ConteudoDaClinica | null> {
  const clinica = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, slug: true },
  });
  if (!clinica) return null;

  const p = prisma as any;
  const [pacientes, equipe, consultas, notasClinicas, pedidosDeExame, videosDeExercicio, mensagens] =
    await Promise.all([
      prisma.user.count({ where: { clinicId, role: "PATIENT" } }),
      prisma.user.count({ where: { clinicId, role: { not: "PATIENT" } } }),
      p.appointment.count({ where: { clinicId } }).catch(() => 0),
      p.clinicalNote.count({ where: { clinicId } }).catch(() => 0),
      p.labOrder.count({ where: { clinicId } }).catch(() => 0),
      p.exerciseSubmission.count({ where: { clinicId } }).catch(() => 0),
      p.clinicMessage.count({ where: { clinicId } }).catch(() => 0),
    ]);

  return {
    ...clinica,
    pacientes,
    equipe,
    consultas,
    notasClinicas,
    pedidosDeExame,
    videosDeExercicio,
    mensagens,
    total:
      pacientes + equipe + consultas + notasClinicas + pedidosDeExame + videosDeExercicio + mensagens,
  };
}
