import { prisma } from "@/lib/db";

/**
 * O que está parado esperando a clínica agir.
 *
 * Existe para responder uma pergunta que o Bruno fez com desconfiança
 * justificada: *"não precisa ficar mandando um monte de e-mail cheio de
 * notificação"*. Ele está certo — um e-mail por evento treina a pessoa a
 * ignorar e-mails.
 *
 * Então o aviso é em duas camadas. **Na hora, sem e-mail**: o badge do menu e
 * a área do paciente, onde o trabalho acontece. **Uma vez por dia**, dentro do
 * e-mail que a clínica já recebe, a lista do que **continua** esperando.
 *
 * Duas regras fazem isso funcionar em vez de virar ruído:
 *
 * 1. **Só conta o que ainda está parado.** O que já foi visto nunca é cobrado
 *    de novo — um resumo que repete o que você já resolveu ensina a não ler.
 * 2. **Nenhum detalhe clínico sai daqui.** O e-mail diz que há três vídeos
 *    para ver, não de quem nem de quê. Caixa de e-mail não é prontuário.
 */

export interface ClinicWaiting {
  /** Vídeos de exercício que o paciente mandou e ninguém assistiu. */
  exerciseVideos: number;
  /** Mensagens de paciente sem leitura. */
  unreadMessages: number;
  /** Medições do manguito da clínica sem dono. */
  unassignedMeasurements: number;
  /**
   * Paciente em tratamento cujo app está vazio: nenhum exercício prescrito.
   *
   * Só conta quem **já é** paciente da clínica — tem pacote pago e ativo.
   * Quem criou a conta e ainda não foi atendido não entra: seria cobrar da
   * clínica alguém que ainda não é dela.
   */
  patientsWithoutExercises: number;
  /**
   * Mensagens que a automação escreveu e ninguém aprovou.
   *
   * O bloco se chama "Waiting for you" e a aba do painel também — e a fila não
   * aparecia em nenhum dos dois. Ela enchia em silêncio (QA de 25/09, R6).
   */
  messagesAwaitingApproval: number;
  /**
   * Paciente que registrou **dor alta** nos últimos dias e ninguém olhou.
   *
   * O check-in existe para a clínica saber antes da próxima consulta. Dor 8 num
   * domingo, enterrada num feed de atividade, é a informação chegando tarde.
   */
  patientsInPain: number;
  total: number;
}

/**
 * Onde a dor deixa de ser ruído e vira motivo de olhar.
 *
 * 7 numa escala de 0 a 10 é o corte usual de "dor intensa" na prática clínica.
 * Está aqui, com nome, para ser um número discutível — e não um `>= 7` solto no
 * meio de uma consulta.
 */
export const DOR_ALTA = 7;
/** Uma semana: dor de duas semanas atrás não é mais uma pendência de hoje. */
const JANELA_DIAS = 7;

export async function getClinicWaiting(clinicId: string): Promise<ClinicWaiting> {
  const desde = new Date();
  desde.setDate(desde.getDate() - JANELA_DIAS);
  const desdeStr = desde.toISOString().slice(0, 10);

  const [
    exerciseVideos,
    unreadMessages,
    unassignedMeasurements,
    patientsWithoutExercises,
    messagesAwaitingApproval,
    patientsInPain,
  ] = await Promise.all([
    (prisma as any).exerciseSubmission.count({
      where: { clinicId, reviewedAt: null },
    }),
    (prisma as any).clinicMessage.count({
      where: { clinicId, senderRole: "patient", readAt: null },
    }),
    (prisma as any).unassignedMeasurement.count({
      where: { clinicId, assignedAt: null, discardedAt: null },
    }),
    // O app vazio de quem já está em tratamento. Antes disto, a clínica só
    // descobria abrindo o app do paciente — foi assim que apareceu (078).
    prisma.user.count({
      where: {
        clinicId,
        role: "PATIENT",
        packagesAsPatient: { some: { isPaid: true, status: { in: ["PAID", "ACTIVE"] } } },
        receivedExercises: { none: { isActive: true } },
      },
    }),
    (prisma as any).outboundMessage.count({
      where: { clinicId, status: "AWAITING_APPROVAL" },
    }),
    // Pacientes distintos, não registros: três dias seguidos de dor alta é uma
    // pessoa para olhar, não três pendências.
    (prisma as any).dailyCheckIn
      .findMany({
        where: {
          clinicId,
          checkinDate: { gte: desdeStr },
          painLevel: { gte: DOR_ALTA },
        },
        select: { patientId: true },
        distinct: ["patientId"],
      })
      .then((r: { patientId: string }[]) => r.length),
  ]);

  return {
    exerciseVideos,
    unreadMessages,
    unassignedMeasurements,
    patientsWithoutExercises,
    messagesAwaitingApproval,
    patientsInPain,
    total:
      exerciseVideos +
      unreadMessages +
      unassignedMeasurements +
      patientsWithoutExercises +
      messagesAwaitingApproval +
      patientsInPain,
  };
}

/**
 * O bloco do e-mail, ou vazio quando não há nada.
 *
 * Tabela em vez de lista: `list-style` é removido por clientes de e-mail
 * suficientes — o Gmail no celular entre eles — para que sobrasse só texto
 * corrido, que foi exatamente o que pareceu errado na primeira versão do
 * relatório diário.
 */
export function waitingEmailBlock(waiting: ClinicWaiting, baseUrl: string): string {
  if (waiting.total === 0) return "";

  const linha = (um: string, varios: string, n: number, href: string) =>
    n === 0
      ? ""
      : `<tr><td style="padding:10px 16px;border-bottom:1px solid #E4E3DF;">
           <a href="${baseUrl}${href}" style="color:#20242D;text-decoration:none;">
             <strong style="font-size:16px;">${n}</strong>
             <span style="color:#5B616C;"> ${n === 1 ? um : varios}</span>
           </a></td></tr>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background-color:#F3ECDD;border-left:3px solid #826637;border-radius:8px;padding:14px 16px;">
        <p style="margin:0 0 8px;font-weight:700;color:#20242D;">Waiting for you</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${linha("exercise video to watch", "exercise videos to watch", waiting.exerciseVideos, "/admin/patients")}
          ${linha("message from a patient", "messages from patients", waiting.unreadMessages, "/admin/patients")}
          ${linha("blood pressure reading to assign", "blood pressure readings to assign", waiting.unassignedMeasurements, "/admin/measurements/inbox")}
          ${linha("patient in treatment with no exercises yet", "patients in treatment with no exercises yet", waiting.patientsWithoutExercises, "/admin/patients")}
          ${linha("message waiting for your approval", "messages waiting for your approval", waiting.messagesAwaitingApproval, "/admin/outbox")}
          ${linha("patient reporting severe pain this week", "patients reporting severe pain this week", waiting.patientsInPain, "/admin/patients")}
        </table>
      </td></tr>
    </table>`;
}
