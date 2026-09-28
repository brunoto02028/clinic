import { prisma } from "@/lib/db";
import { getPatientReportData, renderPatientReportHTML } from "@/lib/patient-report";

/**
 * O relatório que nasce sozinho (099 T-5).
 *
 * ## As três coisas que costumam virar uma só
 *
 * **Gerar** é cálculo sobre o que já está no prontuário — ninguém precisa
 * apertar nada para uma média de sono existir.
 *
 * **Disponibilizar** no app é o produto: a pessoa abre e está lá. Isso é ela
 * buscar, não nós enviarmos.
 *
 * **Avisar** é envio, e é a única das três que toca alguém sem ela pedir.
 *
 * O Bruno pediu a automação completa, e é o que está aqui. O que a separa de
 * um disparo em massa no primeiro dia é `Clinic.autoReportsEnabled`, que nasce
 * desligada: ele vê funcionando como paciente de teste e então liga para a
 * clínica inteira, num clique.
 *
 * ## Idempotência não é detalhe
 *
 * `@@unique([patientId, cadence, periodStart])` é o que faz rodar duas vezes
 * no mesmo período não criar dois relatórios. O agendador em processo roda a
 * cada intervalo e um contêiner reiniciado repete a janela — sem a chave, a
 * pessoa acordaria com quatro relatórios da mesma semana.
 */

export type Cadencia = "NONE" | "DAILY" | "WEEKLY";

/**
 * O começo do período que está vencendo agora.
 *
 * Diário: ontem. Semanal: a segunda-feira da semana passada. Âncoras fixas, e
 * não "sete dias atrás", porque o relatório de uma semana tem de ser o mesmo
 * independentemente da hora em que o contêiner acordou.
 */
export function inicioDoPeriodo(cadencia: Cadencia, agora = new Date()): Date | null {
  if (cadencia === "NONE") return null;

  const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));

  if (cadencia === "DAILY") {
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }

  // Segunda como início da semana. `getUTCDay()` devolve 0 no domingo.
  const diaDaSemana = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diaDaSemana - 7);
  return d;
}

export function fimDoPeriodo(cadencia: Cadencia, inicio: Date): Date {
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + (cadencia === "DAILY" ? 1 : 7));
  return fim;
}

/** Quantos dias o relatório cobre — o que o corpo dele mede. */
export function diasDoPeriodo(cadencia: Cadencia): number {
  return cadencia === "DAILY" ? 1 : 7;
}

export interface ResultadoDaRodada {
  clinicasLigadas: number;
  pacientesConsiderados: number;
  gerados: number;
  jaExistiam: number;
  falhas: number;
}

/**
 * Gera o que estiver vencido. **Não envia nada** — quem avisa é outro passo.
 */
export async function gerarRelatoriosVencidos(
  opts: { agora?: Date; clinicId?: string; patientId?: string } = {}
): Promise<ResultadoDaRodada> {
  const agora = opts.agora ?? new Date();
  const r: ResultadoDaRodada = {
    clinicasLigadas: 0,
    pacientesConsiderados: 0,
    gerados: 0,
    jaExistiam: 0,
    falhas: 0,
  };

  const clinicas = await prisma.clinic.findMany({
    where: { autoReportsEnabled: true, ...(opts.clinicId ? { id: opts.clinicId } : {}) },
    select: { id: true, defaultReportCadence: true },
  });
  r.clinicasLigadas = clinicas.length;
  if (!clinicas.length) return r;

  for (const clinica of clinicas) {
    const pacientes = await prisma.user.findMany({
      where: {
        clinicId: clinica.id,
        role: "PATIENT",
        isActive: true,
        deletedAt: null,
        // Quem foi cadastrado e nunca virou paciente de verdade não recebe
        // relatório de um tratamento que não existe.
        isClinicPatient: true,
        ...(opts.patientId ? { id: opts.patientId } : {}),
      },
      select: { id: true, reportCadence: true },
    });

    for (const p of pacientes) {
      // Nulo quer dizer "o que a clínica decidiu": ligar para todo mundo é uma
      // chave só, e quem precisa de exceção tem exceção.
      const cadencia = (p.reportCadence ?? clinica.defaultReportCadence) as Cadencia;
      if (cadencia === "NONE") continue;
      r.pacientesConsiderados++;

      const inicio = inicioDoPeriodo(cadencia, agora);
      if (!inicio) continue;

      const jaTem = await (prisma as any).patientReport.findUnique({
        where: {
          patientId_cadence_periodStart: {
            patientId: p.id,
            cadence: cadencia,
            periodStart: inicio,
          },
        },
        select: { id: true },
      });
      if (jaTem) {
        r.jaExistiam++;
        continue;
      }

      try {
        const dados = await getPatientReportData(p.id, { days: diasDoPeriodo(cadencia) });
        if (!dados.patient) continue;
        const html = renderPatientReportHTML(dados, { forEmail: true });

        await (prisma as any).patientReport.create({
          data: {
            clinicId: clinica.id,
            patientId: p.id,
            cadence: cadencia,
            periodStart: inicio,
            periodEnd: fimDoPeriodo(cadencia, inicio),
            html,
          },
        });
        r.gerados++;
      } catch (e: any) {
        // Um paciente que falha não pode levar os outros junto: a rodada
        // inteira ficaria sem relatório por causa de um prontuário estranho.
        r.falhas++;
        console.error("[patient-reports] failed for", p.id, e?.message);
      }
    }
  }

  return r;
}
