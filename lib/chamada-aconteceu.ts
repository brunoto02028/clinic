import { prisma } from "@/lib/db";

/**
 * A consulta por vídeo aconteceu? (103 T-1)
 *
 * O Bruno: *"quando uma consulta não acontece, é cancelada, isso precisa ficar
 * registrado no APP e no sistema da clinic"*.
 *
 * Presencial e domicílio ninguém sabe pelo sistema — só quem estava lá. O vídeo
 * é o único formato em que dá para saber, e é o que este arquivo responde.
 *
 * ## A distinção que justifica o arquivo inteiro
 *
 * **"Só o paciente entrou" não é falta do paciente.** É falta da clínica, e a
 * consequência é oposta: uma tira a sessão do pacote dele, a outra é a casa
 * devendo uma consulta. Sem registro, as duas viram "não aconteceu" e alguém
 * decide no chute — contra a pessoa que apareceu.
 */

export type VeredictoDaChamada =
  | "ninguem"
  | "so_paciente"
  | "so_profissional"
  | "os_dois";

/**
 * Duas entradas da mesma pessoa em menos disto são a mesma presença.
 *
 * Quem cai e volta em trinta segundos não entrou duas vezes. Voltar depois de
 * três minutos, sim — pode ter sido uma segunda tentativa de verdade, e apagar
 * isso esconderia uma chamada que custou a acontecer.
 */
const MESMA_PRESENCA_MIN = 2;

/**
 * Grava que alguém entrou — **depois** de a entrada ter dado certo.
 *
 * Chamado no ponto em que o token é emitido: quem recebeu o token abriu a sala.
 * Entrada recusada (fora da janela, consulta cancelada) não chega aqui, e é
 * assim que tem de ser — recusa não é presença.
 *
 * Nunca lança. Um registro que falha não pode impedir uma consulta de acontecer:
 * o preço de perder a linha é a fila da T-2 perguntar em vez de sugerir; o preço
 * de derrubar a chamada é a consulta não acontecer.
 */
export async function registrarEntrada(opts: {
  appointmentId: string;
  userId: string;
  clinicId: string;
  ehTerapeuta: boolean;
}): Promise<void> {
  try {
    const desde = new Date(Date.now() - MESMA_PRESENCA_MIN * 60_000);
    const recente = await (prisma as any).videoJoin.findFirst({
      where: {
        appointmentId: opts.appointmentId,
        userId: opts.userId,
        joinedAt: { gte: desde },
      },
      select: { id: true },
    });
    if (recente) return;

    await (prisma as any).videoJoin.create({
      data: {
        appointmentId: opts.appointmentId,
        userId: opts.userId,
        clinicId: opts.clinicId,
        role: opts.ehTerapeuta ? "THERAPIST" : "PATIENT",
      },
    });
  } catch (e) {
    console.error("[chamada] não consegui registrar a entrada:", (e as any)?.message);
  }
}

export interface ResumoDaChamada {
  veredito: VeredictoDaChamada;
  /** A primeira vez que cada lado entrou — é o que conta a história. */
  profissionalEntrouAs: Date | null;
  pacienteEntrouAs: Date | null;
  /** Quantas entradas ao todo, incluindo reentradas legítimas. */
  entradas: number;
}

/**
 * O que houve nesta consulta.
 *
 * A **primeira** entrada de cada lado, e não a última: é ela que diz se a
 * pessoa apareceu, e a que permite ver quem esperou por quem.
 */
export async function resumoDaChamada(appointmentId: string): Promise<ResumoDaChamada> {
  const linhas = await (prisma as any).videoJoin.findMany({
    where: { appointmentId },
    orderBy: { joinedAt: "asc" },
    select: { role: true, joinedAt: true },
  });

  const primeira = (papel: string) =>
    linhas.find((l: any) => l.role === papel)?.joinedAt ?? null;

  const profissionalEntrouAs = primeira("THERAPIST");
  const pacienteEntrouAs = primeira("PATIENT");

  const veredito: VeredictoDaChamada =
    profissionalEntrouAs && pacienteEntrouAs
      ? "os_dois"
      : profissionalEntrouAs
        ? "so_profissional"
        : pacienteEntrouAs
          ? "so_paciente"
          : "ninguem";

  return { veredito, profissionalEntrouAs, pacienteEntrouAs, entradas: linhas.length };
}

/**
 * O que a fila da T-2 mostra, em inglês e português.
 *
 * Mora aqui, e não na tela, porque a frase carrega um julgamento — *a falta foi
 * da clínica* — e esse julgamento não pode variar entre duas telas.
 */
export function frasesDoVeredito(v: VeredictoDaChamada): {
  en: string;
  pt: string;
  /** `true` quando marcar falta do paciente seria injusto. */
  culpaDaClinica: boolean;
} {
  switch (v) {
    case "os_dois":
      return { en: "Both joined the room.", pt: "Os dois entraram na sala.", culpaDaClinica: false };
    case "so_paciente":
      return {
        en: "Only the patient joined — nobody from the clinic was there.",
        pt: "Só o paciente entrou — ninguém da clínica estava lá.",
        culpaDaClinica: true,
      };
    case "so_profissional":
      return {
        en: "Only the clinic joined. The patient did not.",
        pt: "Só a clínica entrou. O paciente não.",
        culpaDaClinica: false,
      };
    default:
      return { en: "Nobody joined the room.", pt: "Ninguém entrou na sala.", culpaDaClinica: false };
  }
}
