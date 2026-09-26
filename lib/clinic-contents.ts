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
 *
 * ## Duas correções da revisão de 26/09/2026
 *
 * **O modelo estava errado e derrubava tudo.** A contagem chamava
 * `prisma.clinicalNote`, que não existe: o modelo é `SOAPNote`. E `.catch()`
 * não salvava, porque o `TypeError` de ler `.count` de `undefined` acontece
 * ao **montar** o array, antes de haver promise. Resultado: a função sempre
 * rejeitava, e o GET e o DELETE da rota respondiam 500. A funcionalidade
 * inteira estava morta no dia em que nasceu.
 *
 * **E a falha em silêncio desarmava a trava.** Se uma contagem falhasse ela
 * virava zero, `total` lia zero numa clínica cheia, e o DELETE liberava sem
 * exigir `force`. Uma trava para cascata tem de falhar **fechada**: agora um
 * erro de contagem é reportado, e quem lê decide sabendo que não sabe.
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
  /**
   * Quais contagens não puderam ser feitas.
   *
   * Vazio é o normal. Não vazio significa que `total` é um piso, não um
   * número — e a rota trata isso como "não sei", nunca como "não tem nada".
   */
  falhas: string[];
}

/** Conta, e devolve o erro em vez de fingir zero. */
async function contar(
  nome: string,
  fn: () => Promise<number>
): Promise<{ nome: string; n: number; falhou: boolean }> {
  try {
    // `await` dentro do `try`: sem ele, uma rejeição escaparia daqui.
    return { nome, n: await fn(), falhou: false };
  } catch {
    return { nome, n: 0, falhou: true };
  }
}

export async function conteudoDaClinica(clinicId: string): Promise<ConteudoDaClinica | null> {
  const clinica = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, slug: true },
  });
  if (!clinica) return null;

  const p = prisma as any;
  const contagens = await Promise.all([
    contar("pacientes", () => prisma.user.count({ where: { clinicId, role: "PATIENT" } })),
    contar("equipe", () => prisma.user.count({ where: { clinicId, role: { not: "PATIENT" } } })),
    contar("consultas", () => p.appointment.count({ where: { clinicId } })),
    // `SOAPNote`, não `ClinicalNote` — este era o nome errado que derrubava
    // a função inteira.
    contar("notasClinicas", () => p.sOAPNote.count({ where: { clinicId } })),
    contar("pedidosDeExame", () => p.labOrder.count({ where: { clinicId } })),
    contar("videosDeExercicio", () => p.exerciseSubmission.count({ where: { clinicId } })),
    contar("mensagens", () => p.clinicMessage.count({ where: { clinicId } })),
  ]);

  const valor = (nome: string) => contagens.find((c) => c.nome === nome)?.n ?? 0;

  return {
    ...clinica,
    pacientes: valor("pacientes"),
    equipe: valor("equipe"),
    consultas: valor("consultas"),
    notasClinicas: valor("notasClinicas"),
    pedidosDeExame: valor("pedidosDeExame"),
    videosDeExercicio: valor("videosDeExercicio"),
    mensagens: valor("mensagens"),
    total: contagens.reduce((soma, c) => soma + c.n, 0),
    falhas: contagens.filter((c) => c.falhou).map((c) => c.nome),
  };
}
