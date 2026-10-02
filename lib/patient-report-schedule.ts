import { prisma } from "@/lib/db";
import { getPatientReportData, renderPatientReportHTML } from "@/lib/patient-report";
import { temAlgumDado } from "@/lib/patient-monitoring";

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

/**
 * As cadências que **este** cron entende.
 *
 * `ON_DEMAND` existe no enum do schema (118 T-5) e **não** está aqui de
 * propósito: não é uma cadência, é um pedido do paciente. O cron tem de o tratar
 * como "não geres nada", e isso não pode ficar implícito — ver `GERA_SOZINHO`.
 */
export type Cadencia = "NONE" | "DAILY" | "WEEKLY" | "ON_DEMAND";

/**
 * As cadências que fazem o cron gerar um relatório sozinho.
 *
 * **Uma lista do que gera, e não uma do que não gera.** Um valor novo no enum
 * entra como "não gera" por omissão, que é o lado seguro: a regra em vigor é que
 * nada chega a um paciente automaticamente sem decisão explícita.
 *
 * Sem isto, o `ON_DEMAND` caía no ramo **semanal** do `inicioDoPeriodo` — a
 * última condição é um `else` — e um paciente marcado como *"só a pedido"*
 * passaria a receber um relatório automático toda a segunda-feira. O `as
 * Cadencia` no corpo da rodada escondia-o: o tipo dizia que não podia acontecer
 * enquanto o banco dizia que podia.
 */
const GERA_SOZINHO: ReadonlySet<Cadencia> = new Set<Cadencia>(["DAILY", "WEEKLY"]);

/** Esta cadência faz o cron gerar um relatório sem ninguém pedir? */
export function geraSozinho(cadencia: Cadencia | string | null | undefined): boolean {
  return GERA_SOZINHO.has(cadencia as Cadencia);
}

/**
 * O começo do período que está vencendo agora.
 *
 * Diário: ontem. Semanal: a segunda-feira da semana passada. Âncoras fixas, e
 * não "sete dias atrás", porque o relatório de uma semana tem de ser o mesmo
 * independentemente da hora em que o contêiner acordou.
 */
export function inicioDoPeriodo(cadencia: Cadencia, agora = new Date()): Date | null {
  /* Tudo o que não gera sozinho não tem período a vencer. */
  if (!geraSozinho(cadencia)) return null;

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
  /**
   * Quantos períodos passaram **sem nada**.
   *
   * O Bruno: *"se não tiver nenhum tipo de informação, eu vou ser avisado"*.
   * A linha nasce mesmo assim — é o registro de que olhamos — mas marcada, e
   * o paciente não a vê: um relatório semanal dizendo "nada" é pior que
   * nenhum relatório.
   */
  semDados: number;
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
    semDados: 0,
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
      if (!geraSozinho(cadencia)) continue;
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

        const houveAlgo = temAlgumDado((dados as any).monitoring);
        const html = houveAlgo ? renderPatientReportHTML(dados, { forEmail: true }) : "";

        await (prisma as any).patientReport.create({
          data: {
            clinicId: clinica.id,
            patientId: p.id,
            cadence: cadencia,
            periodStart: inicio,
            periodEnd: fimDoPeriodo(cadencia, inicio),
            html,
            hasData: houveAlgo,
          },
        });
        if (houveAlgo) r.gerados++;
        else r.semDados++;
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
