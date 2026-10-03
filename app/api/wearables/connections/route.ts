export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { deliveryState, ensureCheckedSoon, bloodPressureMissing } from '@/lib/withings-subscriptions';
import { daysSilent, isSilent, silenceThreshold } from '@/lib/wearable-silence';

export async function GET() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await (prisma as any).wearableConnection.findMany({
    /**
     * `DISCONNECTED` fica de fora; **`ERROR` nao** (114 T-2, achado do QA).
     *
     * O filtro era `status: 'CONNECTED'`, e por isso uma ligacao **partida**
     * desaparecia da tela do paciente: ele via o convite *Connect*, como se
     * nunca tivesse ligado nada — e perdia tambem o caminho *Ver meus dados*,
     * porque a lista vinha vazia.
     *
     * Era o pior caso possivel: **exatamente quando a ligacao cai**, que e o
     * momento em que a T-7 existe para avisar, o paciente deixava de ver que
     * havia alguma coisa para resolver.
     *
     * `lib/wearable-silence.ts` ja tinha escrito a distincao, com um comentario
     * a dizer que o `ERROR` *"e justamente o que precisa aparecer"* — e esse
     * cuidado era inalcancavel daqui. A rota irma da clinica nunca filtrou por
     * `status`, e e por isso que os dois lados discordavam sobre o mesmo
     * paciente.
     */
    where: { userId: eff.userId, status: { not: 'DISCONNECTED' } },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      // A data que **significa dado**. `lastSyncedAt` diz quando falamos com o
      // provedor, e falamos com ele haja ou nao haja medicao — foi essa
      // confusao que fez a tela dizer "ultimo sync: hoje" com dias de silencio
      // atras (114 T-2).
      lastReadingAt: true,
      /*
       * **A mensagem da última falha** (119 T-8, achado do QA).
       *
       * A coluna existe desde sempre e esta rota nunca a devolveu — por isso a
       * pendência `falha_na_sincronizacao` da app nunca podia nascer, e a frase
       * *"A última sincronização falhou"* era código morto. O admin e o cron
       * liam-na; o paciente não.
       */
      lastSyncError: true,
      lastSyncErrorAt: true,
      /**
       * **O estado, e não só a mensagem** (121 T-3).
       *
       * A app decidia *"a autorização expirou"* casando a **mensagem de texto**
       * com `/refresh_token|invalid_grant|unauthor/i`. Funciona enquanto a frase
       * da Withings não mudar — e uma tela que fica muda porque uma mensagem de
       * terceiro mudou de palavras é a ausência silenciosa com outro nome.
       *
       * Agora há um estado: `needsReauthAt`. A mensagem fica, para dizer **o
       * quê**; a decisão passa a ser do estado.
       */
      needsReauthAt: true,
      createdAt: true,
      notifyConfirmedAppli: true,
      notifyCheckedAt: true,
      // Para saber se esta ligacao pessoal divide a conta com o aparelho da
      // clinica — e, sendo assim, se ela esta **muda para pressao** de
      // proposito (092 T-1).
      providerUserId: true,
      isClinicDevice: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Uma conexão anterior a este trabalho nunca foi perguntada. Confere em
  // segundo plano na primeira vez que alguém abre a lista, em vez de ficar
  // `unchecked` para sempre.
  for (const c of connections) {
    if (c.provider === 'WITHINGS') ensureCheckedSoon(c);
  }

  // O limiar de silencio e da clinica (`WEARABLE_SILENCE`), e nao um numero que
  // esta tela inventa: quem mede uma vez por semana nao e quem mede toda manha.
  const eu = await prisma.user.findUnique({
    where: { id: eff.userId },
    select: { clinicId: true },
  });
  const limite = await silenceThreshold(eu?.clinicId);

  /**
   * **A ligacao pessoal que nao recebe pressao de proposito** (achado do Bruno,
   * 30/09, olhando a propria tela).
   *
   * Quando a mesma conta Withings esta ligada duas vezes — uma como aparelho da
   * clinica, outra como pessoal —, a pessoal **nao processa pressao**: num
   * aparelho partilhado so a da clinica sabe de quem e a leitura (092 T-1).
   *
   * O efeito colateral so apareceu agora, com a tela a dizer ha quantos dias
   * nada chega: um medidor de pressao **so produz pressao**, entao a ligacao
   * pessoal nunca recebe nada — e o silencio dela cresce para sempre. A tela
   * mandava *"verifique o aparelho, ou reconecte"* sobre um aparelho que estava
   * perfeitamente ligado, a medir todos os dias.
   *
   * Um aviso que manda arranjar o que nao esta partido gasta a paciencia de
   * quem o le, e da terceira vez ninguem le mais. Entao a tela passa a dizer o
   * que e verdade: **a pressao desta conta entra pela clinica**.
   */
  const contasDaClinica = new Set(
    (
      await (prisma as any).wearableConnection.findMany({
        where: {
          provider: "WITHINGS",
          isClinicDevice: true,
          providerUserId: { in: connections.map((c: any) => c.providerUserId).filter(Boolean) },
        },
        select: { providerUserId: true },
      })
    ).map((c: any) => c.providerUserId)
  );

  // `status: CONNECTED` only ever meant "the authorisation worked". Whether
  // anything is actually coming is a second question, and until activity 075
  // nothing asked it — a device could be authorised and silent and look
  // exactly like one that was working.
  return NextResponse.json({
    // Só a Withings escreve essas colunas, e só ela tem como reassinar. Mandar
    // `delivery` para os outros provedores seria um dado que a tela pintaria de
    // âmbar com um texto sobre a Withings e sem botão nenhum para resolver.
    connections: connections.map((c: any) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      lastSyncedAt: c.lastSyncedAt,
      lastReadingAt: c.lastReadingAt,
      /** Porque a última tentativa falhou — ou `null` se correu bem. */
      lastSyncError: c.lastSyncError ?? null,
      lastSyncErrorAt: c.lastSyncErrorAt ?? null,
      /**
       * **A ligação precisa da pessoa** — e desde quando (121 T-3).
       *
       * É o que a app usa para decidir, em vez de casar a mensagem de texto da
       * Withings. A mensagem continua a ir, para dizer **o quê**.
       */
      needsReauthAt: c.needsReauthAt ?? null,
      // Autorizado, a entregar, e mesmo assim calado ha dias: o aparelho pode
      // estar fora da tomada, ou a pessoa pode ter parado de medir. A promessa
      // do provedor e a chegada do dado sao perguntas diferentes, e a tela
      // precisa das duas para nao pintar de verde um silencio.
      daysSilent: daysSilent(c),
      /**
       * Muda para pressao **por desenho**, e nao por defeito.
       *
       * Nesse caso o silencio nao e noticia: a conta entrega pela ligacao da
       * clinica, e esta nunca vai receber nada de um aparelho que so mede
       * pressao.
       */
      pressaoPelaClinica:
        c.isClinicDevice !== true && !!c.providerUserId && contasDaClinica.has(c.providerUserId),
      silent:
        c.isClinicDevice !== true && !!c.providerUserId && contasDaClinica.has(c.providerUserId)
          ? false
          : isSilent(c, limite),
      silenceThreshold: limite,
      createdAt: c.createdAt,
      delivery: c.provider === 'WITHINGS' ? deliveryState(c) : undefined,
      // Numa clínica construída em torno da pressão, faltar pressão e faltar
      // sono não são a mesma notícia — e "enviando só parte" escondia as duas
      // atrás da mesma frase.
      missingBloodPressure: c.provider === 'WITHINGS' ? bloodPressureMissing(c) : undefined,
    })),
  });
}
