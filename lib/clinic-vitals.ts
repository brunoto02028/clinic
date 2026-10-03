import { pickSession, ESTADOS_QUE_RECEBEM_EVENTO } from "@/lib/clinic-session-match";

/*
 * **O banco entra por `await import`, e não no topo.**
 *
 * Pela mesma razão que `clinic-session-match.ts` não tem imports nenhuns: a
 * decisão — `grupoEAtribuivel` — é o que pode regredir em silêncio, e assim ela
 * é testável sem banco, sem mocks e sem o cliente do Prisma gerado.
 */

/**
 * A temperatura e o SpO₂ medidos **num paciente**, com o aparelho da clínica
 * (122 T-3).
 *
 * A pressão tem `clinic-device.ts` e o ECG entra pela ingestão; faltava isto.
 * Até aqui a temperatura e o SpO₂ de um paciente não entravam em lado nenhum: a
 * ligação pessoal filtra-os para não caírem no dono do aparelho, e a da clínica
 * não os lia.
 *
 * ## A regra, e porque ela existe
 *
 * Dentro da janela de três minutos o aparelho da clínica mede o paciente — e o
 * relógio do dono continua no pulso dele. A regra *"o que se usa no pulso é
 * sempre do dono"* **não se aplica aqui**: o `getmeas` traz `deviceid` mas não o
 * modelo, e o `v2/user getdevice` que o traria exige o scope `user.info`, que
 * obrigaria todos os pacientes a reautorizar.
 *
 * Sem saber o aparelho, a pergunta passa a ser outra: **isto é uma medição que
 * alguém fez, ou algo que um aparelho produz sozinho?**
 */

/**
 * Este grupo de medidas é de alguém a medir — ou de um aparelho a trabalhar?
 *
 * SpO₂ e temperatura **corporal** não acontecem sem alguém os pedir: são o acto
 * que a janela existe para nomear. Frequência cardíaca e temperatura da **pele**
 * saem de um relógio o dia inteiro, sozinhas.
 *
 * A FC que vem no **mesmo grupo** de um SpO₂ é a daquela medição, e entra com
 * ela.
 */
export interface MedidasDoGrupo {
  spo2?: number;
  temperature?: number;
  bodyTemperature?: number;
  skinTemperature?: number;
  heartRate?: number;
}

export function grupoEAtribuivel(v: MedidasDoGrupo): boolean {
  /*
   * `!== undefined` e não truthy: um `0` é um valor, e lê-lo como ausência é a
   * confusão que já apagou dados noutras partes desta base.
   */
  return (
    v.spo2 !== undefined || v.temperature !== undefined || v.bodyTemperature !== undefined
  );
}

export interface JanelaParaVitais {
  id: string;
  status: string;
  openedAt: Date | string;
  expiresAt: Date | string;
  patientId: string;
  openedById: string;
  context: string;
}

export type AtribuicaoDeVital =
  | { kind: "assigned"; patientId: string; readingId: string; sessionId: string }
  | { kind: "duplicate" }
  | { kind: "skipped"; reason: "so-passivo" | "sem-janela" | "ambiguo" | "implausivel" };

/**
 * **Uma casa decimal, como o outro caminho faz** (achado do review).
 *
 * A Withings manda a temperatura como `value: 368, unit: -1`, e
 * `368 * 10^-1` em vírgula flutuante dá **36.800000000000004**. O caminho
 * pessoal arredonda em `vitalsByDay`; este guardava o double cru, e a tela
 * imprimia os dezassete dígitos na ficha de um paciente.
 */
const umaCasa = (n: number): number => Math.round(n * 10) / 10;

/**
 * **O que não pode ser uma medição de uma pessoa viva.**
 *
 * O cabeçalho de `withings-vitals.ts` diz que *"uma tela a mostrar SpO₂ 0% seria
 * uma medição que nunca aconteceu"* — e tinha razão para a ausência, mas nada
 * recusava um zero que a API mandasse de facto, de uma oximetria abortada.
 *
 * Não é inventar um número: é recusar escrever num prontuário algo que não pode
 * ser uma medição. E não é silencioso — é contado e dito no log.
 *
 * As faixas são largas de propósito. Não são faixa de referência clínica (isso
 * é leitura de médico): são o limite do que um aparelho pode ter medido numa
 * pessoa.
 */
export function valorPlausivel(v: MedidasDoGrupo): boolean {
  if (v.spo2 !== undefined && !(v.spo2 > 0 && v.spo2 <= 100)) return false;
  const t = v.bodyTemperature ?? v.temperature;
  if (t !== undefined && !(t >= 25 && t <= 45)) return false;
  return true;
}

/**
 * Grava uma medição de vitais no prontuário que a janela nomear.
 *
 * Devolve o que aconteceu — quem chama corre num cron ou num webhook, onde
 * ninguém está a olhar, e *"não aconteceu nada"* nunca pode ser silencioso.
 */
export async function atribuirVitalDaClinica(
  clinicId: string,
  janelas: readonly JanelaParaVitais[],
  v: MedidasDoGrupo & {
    measuredAt: Date | string;
    measureId?: string | null;
    timezone?: string | null;
  }
): Promise<AtribuicaoDeVital> {
  if (!grupoEAtribuivel(v)) return { kind: "skipped", reason: "so-passivo" };
  if (!valorPlausivel(v)) return { kind: "skipped", reason: "implausivel" };

  const escolha = pickSession(janelas, v.measuredAt, ESTADOS_QUE_RECEBEM_EVENTO);
  if (escolha.kind === "none") return { kind: "skipped", reason: "sem-janela" };
  /* Ambiguidade nunca vira palpite — a regra de ouro de toda esta atividade. */
  if (escolha.kind === "ambiguous") return { kind: "skipped", reason: "ambiguo" };

  const janela = escolha.session as unknown as JanelaParaVitais;

  /*
   * O webhook e a varredura trazem a mesma medição. O id do grupo da Withings é
   * a chave; sem ele não se escreve, porque num aparelho partilhado um id
   * inventado colide entre dois pacientes.
   */
  if (!v.measureId) return { kind: "skipped", reason: "sem-janela" };

  const { prisma } = await import("@/lib/db");
  const jaLa = await (prisma as any).vitalReading.findFirst({
    where: { patientId: janela.patientId, withingsMeasureId: v.measureId },
    select: { id: true },
  });
  if (jaLa) return { kind: "duplicate" };

  /** A corporal ganha à da pele: é a que alguém mediu. */
  const temperaturaCrua = v.bodyTemperature ?? v.temperature;
  const temperatura = temperaturaCrua !== undefined ? umaCasa(temperaturaCrua) : undefined;

  let criada: { id: string };
  try {
    criada = await (prisma as any).vitalReading.create({
      data: {
        patientId: janela.patientId,
        clinicId,
        recordedById: janela.openedById,
        spo2: v.spo2 !== undefined ? umaCasa(v.spo2) : null,
        temperature: temperatura ?? null,
        heartRate: v.heartRate != null ? Math.round(v.heartRate) : null,
        measuredAt: new Date(v.measuredAt),
        timezone: v.timezone ?? null,
        withingsMeasureId: v.measureId,
        source: "CLINIC_DEVICE",
        context: janela.context,
        notes: "Withings (clinic device)",
        sessionId: janela.id,
      },
      select: { id: true },
    });
  } catch (e: any) {
    /* O webhook e a varredura podem chegar no mesmo instante. */
    if (e?.code === "P2002") return { kind: "duplicate" };
    throw e;
  }

  /*
   * **Uma medição atribuída por regra deixa rasto**, como a pressão e o ECG
   * deixam. Um valor no prontuário de alguém tem de poder dizer por que caminho
   * lá chegou.
   */
  const { logAudit } = await import("@/lib/system-logger");
  await logAudit({
    userId: janela.openedById,
    userEmail: "",
    userRole: "STAFF",
    action: "CLINIC_MEASUREMENT_ASSIGN",
    entity: "VitalReading",
    entityId: criada.id,
    description: "Clinic device vitals attributed automatically",
    metadata: {
      sessionId: janela.id,
      patientId: janela.patientId,
      measuredAt: v.measuredAt,
      automatic: true,
    },
  }).catch((e: any) =>
    console.error("[clinic-vitals] auditoria falhou:", e?.message ?? e)
  );

  return {
    kind: "assigned",
    patientId: janela.patientId,
    readingId: criada.id,
    sessionId: janela.id,
  };
}
