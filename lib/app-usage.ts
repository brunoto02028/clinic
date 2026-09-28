import { prisma } from "@/lib/db";

/**
 * Quanto tempo as pessoas usam o app (085, T-1).
 *
 * A pergunta do Bruno era "quanto tempo elas estão usando", e ela não tinha
 * resposta: o cadastro diz quem a pessoa é, e nada dizia se ela abriu o app.
 *
 * O que se guarda é a **sessão**, não o toque. Contar eventos responderia a
 * mesma coisa e geraria uma tabela enorme para isso; uma sessão tem começo,
 * último sinal e fim, e "quanto tempo" é a soma.
 */

/**
 * Quanto silêncio encerra uma sessão.
 *
 * Fechar o app não manda nada confiável — o sistema pode matar o processo sem
 * avisar ninguém. Então quem fecha a sessão é a ausência de sinal, e a janela
 * precisa ser maior que o intervalo do sinal (3 min) com folga para rede ruim,
 * e menor que "a pessoa foi almoçar e voltou", que é outra sessão.
 */
export const JANELA_SESSAO_MS = 30 * 60 * 1000;

/** O intervalo em que o app avisa que continua aberto. Vive aqui para o app e o servidor lerem o mesmo número. */
export const INTERVALO_SINAL_MS = 3 * 60 * 1000;

export interface SinalDeUso {
  userId: string;
  clinicId: string | null;
  platform?: string | null;
  appVersion?: string | null;
  /**
   * De onde resolver a cidade, **se** uma sessão nova nascer (085, T-2).
   *
   * É uma função, não um valor, porque quase todo sinal continua uma sessão que
   * já existe — e resolver a cidade a cada três minutos seria consultar o
   * provedor para jogar a resposta fora. Ela só é chamada no nascimento.
   */
  resolverLocal?: () => Promise<{ city: string | null; country: string | null }>;
  /** Só para teste: o "agora" da operação. */
  now?: Date;
}

/**
 * Registra que a pessoa está com o app aberto.
 *
 * Reaproveita a sessão em andamento; se o silêncio passou da janela, fecha a
 * antiga **no último sinal dela** (não no agora — ela não estava aberta esse
 * tempo todo) e começa outra.
 *
 * Nunca lança: um sinal de uso que falha não pode atrapalhar quem está usando o
 * app. Quem chama trata o `null`.
 */
export async function registrarSinal(s: SinalDeUso): Promise<{ sessionId: string; nova: boolean } | null> {
  const agora = s.now ?? new Date();
  const desde = new Date(agora.getTime() - JANELA_SESSAO_MS);

  try {
    const aberta = await prisma.appSession.findFirst({
      where: { userId: s.userId, endedAt: null, lastSeenAt: { gte: desde } },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true },
    });

    if (aberta) {
      await prisma.appSession.update({
        where: { id: aberta.id },
        data: { lastSeenAt: agora, ...(s.appVersion ? { appVersion: s.appVersion } : {}) },
      });
      return { sessionId: aberta.id, nova: false };
    }

    // Antes de abrir outra, fecha as que ficaram mudas. Na leitura, não por
    // cron: os crons deste projeto estão desligados de propósito, e uma sessão
    // aberta para sempre estragaria toda média de tempo.
    await fecharMudas(s.userId, agora);

    // A cidade custa uma chamada de rede, então só na sessão nova — e mesmo
    // assim sem poder falhar: sem cidade é uma sessão sem cidade.
    let local = { city: null as string | null, country: null as string | null };
    if (s.resolverLocal) {
      try {
        local = await s.resolverLocal();
      } catch (e: any) {
        console.error("[usage] não foi possível resolver a cidade", e?.message);
      }
    }

    const nova = await prisma.appSession.create({
      data: {
        userId: s.userId,
        clinicId: s.clinicId,
        startedAt: agora,
        lastSeenAt: agora,
        platform: s.platform ?? null,
        appVersion: s.appVersion ?? null,
        city: local.city,
        country: local.country,
      },
      select: { id: true },
    });
    return { sessionId: nova.id, nova: true };
  } catch (e: any) {
    console.error("[usage] não foi possível registrar o sinal", s.userId, e?.message);
    return null;
  }
}

/**
 * Fecha as sessões que emudeceram, carimbando o **último sinal**.
 *
 * Carimbar o agora diria que a pessoa ficou com o app aberto a noite toda.
 * `updateMany` não deixa copiar coluna, então é uma leitura curta e um update
 * por linha — e são poucas linhas: uma pessoa não acumula sessões mudas.
 */
export async function fecharMudas(userId: string, now = new Date()): Promise<number> {
  const desde = new Date(now.getTime() - JANELA_SESSAO_MS);
  const mudas = await prisma.appSession.findMany({
    where: { userId, endedAt: null, lastSeenAt: { lt: desde } },
    select: { id: true, lastSeenAt: true },
  });
  for (const m of mudas) {
    await prisma.appSession.update({ where: { id: m.id }, data: { endedAt: m.lastSeenAt } });
  }
  return mudas.length;
}

/** Quanto durou uma sessão, em milissegundos. Uma sessão ainda aberta conta até o último sinal. */
export function duracaoDaSessao(s: { startedAt: Date; lastSeenAt: Date; endedAt: Date | null }): number {
  const fim = s.endedAt ?? s.lastSeenAt;
  return Math.max(0, fim.getTime() - s.startedAt.getTime());
}

/**
 * Quanto tempo esta pessoa usou o app num período.
 *
 * Conta pelo `startedAt` dentro da janela: uma sessão que começou antes e
 * atravessou o recorte pertence ao dia em que começou, e não a este. É a
 * escolha que faz a soma dos dias bater com o total.
 */
export async function tempoDeUsoNoPeriodo(userId: string, de: Date, ate: Date): Promise<{ ms: number; sessoes: number }> {
  const linhas = await prisma.appSession.findMany({
    where: { userId, startedAt: { gte: de, lte: ate } },
    select: { startedAt: true, lastSeenAt: true, endedAt: true },
  });
  return {
    ms: linhas.reduce((soma, l) => soma + duracaoDaSessao(l), 0),
    sessoes: linhas.length,
  };
}
