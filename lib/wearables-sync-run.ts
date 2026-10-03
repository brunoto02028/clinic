import { prisma } from "@/lib/db";
import { ingestWithings } from "@/lib/withings-ingest";
import { subscribeAndRecord, deliveryState } from "@/lib/withings-subscriptions";
import { avisarSeCaiu } from "@/lib/wearable-caiu";

/**
 * Quanto tempo uma confirmacao de assinatura vale (114 T-3).
 *
 * **Uma hora**, que na pratica quer dizer *toda corrida*: o cron corre de duas
 * em duas horas, entao qualquer valor abaixo disso reconfirma sempre.
 *
 * Comecou em doze, e o Bruno pediu menos — *"assim que chegar o meu relogio vai
 * ser bom para testar, porque ele vai estar conectado 24 horas."* Ele tem razao
 * e o numero era timido: o que custa e **uma chamada por conexao por corrida**,
 * e o plano gratuito da Withings vai ate 5.000 por dia. Com doze corridas
 * diarias e um punhado de conexoes, isto nao chega perto do limite.
 *
 * O limitador real nunca foi este numero: era a **frequencia do cron**. Com ele
 * de seis em seis horas, doze horas significava reconfirmar em corridas
 * alternadas. Os dois desceram juntos.
 */
const CONFIRMACAO_VALE_MS = 1 * 60 * 60 * 1000;

/**
 * Se vale a pena perguntar a Withings se ela ainda esta a avisar.
 *
 * **O defeito que isto conserta:** a condicao aqui era `!c.notifyCheckedAt` —
 * ou seja, a assinatura era confirmada **uma vez na vida**. Depois da primeira
 * confirmacao bem sucedida, `notifyCheckedAt` ficava preenchido e ninguem
 * voltava a perguntar. Se a Withings deixasse de avisar depois disso — por
 * expiracao, por revogacao, ou porque o nosso webhook respondeu errado uma vez
 * — o silencio durava para sempre, e a tela continuava a dizer "conectado".
 *
 * O Bruno, 30/09/2026: *"essa conexao eu quero ter certeza que nao vai ser
 * perdida."* Uma confirmacao unica nao da essa certeza; uma reconfirmacao
 * periodica da.
 *
 * Tres motivos para perguntar de novo:
 *
 * - **nunca perguntamos** — o caso original;
 * - **a resposta esta velha** — mais do que `CONFIRMACAO_VALE_MS`, que hoje e
 *   uma hora. O numero vive na constante, e nao aqui: um comentario com o
 *   valor escrito a mao fica velho no primeiro ajuste, e ja tinha ficado.
 * - **a resposta era incompleta** — a Withings confirmou parte dos tipos, ou
 *   nenhum. `deliveryState` chama a isso `partial` e `silent`, e os dois
 *   significam que ha dado a nao chegar.
 */
function precisaReconfirmar(c: {
  notifyCheckedAt?: Date | null;
  notifyConfirmedAppli?: number[] | null;
}): boolean {
  if (!c.notifyCheckedAt) return true;
  const estado = deliveryState(c);
  if (estado !== "receiving") return true;
  return Date.now() - new Date(c.notifyCheckedAt).getTime() > CONFIRMACAO_VALE_MS;
}


/**
 * The safety net under the webhook.
 *
 * Two places in this codebase said a scheduled sync existed — the OAuth
 * callback, explaining why a failed subscription was survivable, and the
 * clinic-device attribution, explaining why readings are deduplicated by
 * Withings' own group id. Neither was true: nothing in app/api/cron touched a
 * wearable, and the only sync was a button the patient could press. The
 * notification was the single path, so a measurement taken while the container
 * was restarting was a measurement lost, and the deduplication existed for a
 * second path that never ran (activity 075, T-11).
 *
 * Now it runs. Dedup by `grpid` is what makes it safe to overlap with the
 * webhook, and the window deliberately reaches further back than the last
 * reading: a gap is the thing being repaired, so the query has to cover it.
 *
 * Call: curl -X POST https://bpr.clinic/api/cron/wearables-sync?key=SECRET
 */

/** How far back to look beyond the last reading. A missed day is the point. */
const SLACK_DAYS = 3;
const MAX_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A Withings recusa a mesma chamada duas vezes em dez segundos.
 *
 * `601: Same arguments in less than 10 seconds`. Não é limite de quantidade —
 * é dedupe: a mesma chamada, com os mesmos argumentos, no mesmo intervalo.
 *
 * **Duas ligações da mesma conta caem nisso sempre.** A braçadeira da clínica e
 * o relógio do Bruno estão na mesma conta Withings; o laço sincronizava uma a
 * seguir à outra, com a mesma janela de datas, e a segunda levava 601 em todas
 * as rodadas. O efeito não era cosmético: a ligação da clínica é a **única
 * autorizada a ler pressão** (a pessoal cala-se de propósito, para a leitura
 * não ser atribuída a quem carrega o aparelho), então o 601 dela significava
 * que a pressão medida não chegava a ninguém.
 *
 * Então espera-se, por conta — e não por ligação: contas diferentes não se
 * atrapalham, e dormir entre elas seria desperdiçar o orçamento da rodada.
 */
const INTERVALO_MINIMO_POR_CONTA_MS = 11_000;

async function esperarAVezDaConta(
  ultimaChamadaPorConta: Map<string, number>,
  conta: string | null | undefined
): Promise<number> {
  if (!conta) return 0;
  const anterior = ultimaChamadaPorConta.get(conta);
  const agora = Date.now();
  let esperou = 0;
  if (anterior !== undefined) {
    const falta = INTERVALO_MINIMO_POR_CONTA_MS - (agora - anterior);
    if (falta > 0) {
      await new Promise((r) => setTimeout(r, falta));
      esperou = falta;
    }
  }
  ultimaChamadaPorConta.set(conta, Date.now());
  return esperou;
}

/**
 * **A rede de segurança por baixo do webhook — agora pendurada** (121 T-6).
 *
 * ## O que faltava
 *
 * Esta passagem existe desde a 075 T-11, escrita com estas palavras: *"a rede
 * de segurança por baixo do webhook"*. Vivia inteira dentro de
 * `app/api/cron/wearables-sync/route.ts`, atrás de um segredo — e **nada a
 * chamava**:
 *
 * - zero tarefas agendadas no Coolify;
 * - nove jobs no agendador interno (e-mails, artigos, relatórios,
 *   transcrições), e **nenhum** de wearables.
 *
 * O único caminho automático era o webhook. Quando a cadeia de tokens da
 * ligação do Bruno morreu, o webhook parou de conseguir ler, e **não havia rede
 * nenhuma por baixo**: 27 dias sem dado, e a única forma de o trazer era ele
 * puxar a tela.
 *
 * ## Porque isto está num ficheiro e não na rota
 *
 * Para o agendador poder chamá-la **sem** passar por HTTP: a rota continua a
 * existir, com o segredo, para quem quiser disparar à mão — mas o laço é o
 * mesmo, e um laço copiado seria dois laços a divergir.
 */
export async function correrSincronizacaoDeWearables() {

  // Quem sincronizou há mais tempo vai primeiro: se o orçamento acabar, a
  // rodada seguinte pega a cauda em vez de repetir sempre a mesma cabeça.
  const connections = await (prisma as any).wearableConnection.findMany({
    where: { provider: "WITHINGS", status: { in: ["CONNECTED", "ERROR"] } },
    orderBy: { lastSyncedAt: "asc" },
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      isClinicDevice: true,
      clinicId: true,
      // É por ele que se sabe que esta conexão pessoal divide a conta com a da
      // clínica — e, sendo assim, não processa pressão (092 T-1). Sem isto a
      // varredura diária voltaria a salvar no prontuário do dono as medições
      // feitas nos pacientes, alertas inclusive.
      providerUserId: true,
      lastReadingAt: true,
      lastSyncedAt: true,
      notifyCheckedAt: true,
      // Para saber se ha um erro anterior a limpar quando esta correr bem.
      lastSyncError: true,
      // Sem isto, `deliveryState` le `undefined` e diz "silent" para toda a
      // gente — o que faria reconfirmar em toda corrida, por uma razao falsa.
      notifyConfirmedAppli: true,
      createdAt: true,
    },
  });

  let synced = 0;
  let withData = 0;
  let failed = 0;
  /**
   * Quantas ligações tiveram **algo não lido** — nem sucesso limpo, nem falha
   * total (achado do code review, 120 T-4).
   *
   * Uma conta cujo ECG falhou mas cujo sono entrou não é `failed` (a passagem
   * não lançou) nem é notícia boa. Sem este número ela desaparecia entre os
   * dois.
   */
  let comFalha = 0;
  let checked = 0;
  /*
   * **Os contadores das séries entram aqui também.**
   *
   * Eu acrescentei-os ao `ingestWithings` e esqueci-me deste objeto — e o
   * resultado foi ficar cego exatamente na coisa que estava a tentar medir: a
   * resposta dizia `activityDays` e `vitalsDays` e não dizia uma palavra sobre
   * o intraday, o hipnograma ou os treinos. Um contador que não é devolvido é
   * um contador que não existe.
   */
  const totals = {
    bloodPressure: 0,
    /**
     * Quantas leituras de pressão a Withings devolveu, guardadas ou não.
     *
     * Sem este número, um `bp=0` não distingue *"não veio nada"* de *"veio e
     * era tudo repetido"* — e as duas coisas levam a procurar em sítios
     * opostos. Já perdi tempo com essa confusão.
     */
    bloodPressureRead: 0,
    activityDays: 0,
    sleepNights: 0,
    vitalsDays: 0,
    intradayDays: 0,
    hypnogramNights: 0,
    workouts: 0,
    /**
     * O que **não se conseguiu ler** — `"vitais"`, `"ecg"` (120 T-4).
     *
     * Um conjunto e não um contador: a pergunta é *"o quê"*. Vazio dá sentido
     * aos zeros ao lado; com algo dentro, um zero ao lado não é notícia sobre o
     * paciente.
     */
    falhas: new Set<string>(),
    /**
     * Quantas gravações de ECG entraram.
     *
     * O contador existia dentro da ingestão desde sempre e **não subia até
     * aqui**. Em 02/10/2026 disparei uma sincronização exactamente para
     * recuperar um ECG perdido, e o resultado não dizia quantos ECG tinham
     * entrado — fiquei cego no único número que me interessava. É a segunda
     * vez que esta mesma omissão morde nesta rota.
     */
    ecgRecords: 0,
    ecgRead: 0,
    ecgNaoAtribuidos: 0,
  };

  // O scheduled task do Coolify corta em 300s. Parar por conta própria antes
  // disso deixa o trabalho pela metade **de propósito**, com a ordem acima
  // garantindo que a próxima rodada continue de onde esta parou — melhor que
  // ser morto no meio de uma escrita.
  const deadline = Date.now() + 240_000;
  let ranOut = false;

  /** Quando cada conta Withings foi chamada pela última vez nesta rodada. */
  const ultimaChamadaPorConta = new Map<string, number>();
  let esperaTotalMs = 0;

  for (const c of connections) {
    if (Date.now() > deadline) {
      ranOut = true;
      break;
    }

    // A connection nobody has asked about — made before the subscription check
    // existed, or whose check never reached Withings. Doing it here means it
    // no longer waits for somebody to open a screen.
    //
    // A Withings **rotaciona o refresh token a cada refresh**, e grava no
    // banco. O objeto em memória fica velho na hora: reusá-lo logo em seguida
    // significa tentar refrescar com um token que eles acabaram de invalidar —
    // e a ingestão falhava justamente nas conexões que este cron existe para
    // resgatar. Por isso a conexão é relida antes de seguir.
    if (precisaReconfirmar(c)) {
      /*
       * **A espera cobre esta chamada também.**
       *
       * A primeira versão deste conserto espaçava só a ingestão, e o `601`
       * continuou a aparecer em produção — porque a confirmação de subscrição é
       * outra chamada à mesma conta, e gastava a janela de dez segundos antes de
       * a ingestão chegar. Espaçar metade das chamadas é não espaçar.
       */
      esperaTotalMs += await esperarAVezDaConta(ultimaChamadaPorConta, (c as any).providerUserId);
      const outcome = await subscribeAndRecord(c);
      if (outcome.answered) checked++;
      const fresh = await (prisma as any).wearableConnection.findUnique({
        where: { id: c.id },
        select: { accessToken: true, refreshToken: true, tokenExpiresAt: true },
      });
      if (fresh) {
        c.accessToken = fresh.accessToken;
        c.refreshToken = fresh.refreshToken;
        c.tokenExpiresAt = fresh.tokenExpiresAt;
      }
    }

    const anchor = c.lastReadingAt ?? c.lastSyncedAt ?? c.createdAt ?? new Date();
    const since = new Date(
      Math.max(
        new Date(anchor).getTime() - SLACK_DAYS * DAY_MS,
        Date.now() - MAX_WINDOW_DAYS * DAY_MS
      )
    );

    try {
      // Duas ligações da mesma conta não podem fazer a mesma chamada em menos
      // de dez segundos — ver `INTERVALO_MINIMO_POR_CONTA_MS`.
      esperaTotalMs += await esperarAVezDaConta(ultimaChamadaPorConta, (c as any).providerUserId);

      const counts = await ingestWithings(c.userId, c, { since, origem: "cron" });
      synced++;
      totals.bloodPressure += counts.bloodPressure;
      totals.bloodPressureRead += counts.bloodPressureRead ?? 0;
      totals.activityDays += counts.activityDays;
      totals.sleepNights += counts.sleepNights;
      totals.vitalsDays += counts.vitalsDays;
      totals.intradayDays += counts.intradayDays ?? 0;
      totals.hypnogramNights += counts.hypnogramNights ?? 0;
      totals.workouts += counts.workouts ?? 0;
      totals.ecgRecords += counts.ecgRecords ?? 0;
      totals.ecgRead += counts.ecgRead ?? 0;
      /*
       * **O que ninguém reclamou.** Uma gravação que a Withings devolveu e que
       * não entrou em prontuário nenhum — sem janela, com duas, ou com as
       * janelas por ler. Enquanto não houver caixa de entrada para o que não é
       * pressão (122 T-4), é este número que a torna visível.
       */
      totals.ecgNaoAtribuidos += counts.ecgNaoAtribuidos ?? 0;
      /**
       * **O que não se conseguiu ler, por nome** (120 T-4).
       *
       * Não é um contador: é a diferença entre *"este paciente não gravou"* e
       * *"nós não conseguimos ler"*. Sem isto, um `ecg=0` nos totais é as duas
       * coisas, e já foi — o `throw` do ECG subia para o `catch` dos vitais e
       * o log dizia *"vitals failed"*.
       *
       * Junta-se em conjunto porque o que interessa é **o quê**, não quantas
       * ligações: dez contas com o ECG a falhar é um problema, não dez.
       */
      for (const f of counts.falhas ?? []) totals.falhas.add(f);

      const arrived =
        counts.bloodPressure +
          counts.activityDays +
          counts.sleepNights +
          counts.vitalsDays +
          counts.ecgRecords >
        0;
      if (arrived) withData++;
      /*
       * **E conta-se à parte quantas ligações tiveram algo não lido.**
       *
       * Sem isto, uma conta cujo ECG e vitais falharam e que não trouxe
       * pressão, actividade nem sono nova contava como `withData` falso — *"não
       * chegou nada"* — e o `failed` não subia. Duas notícias opostas com o
       * mesmo número.
       */
      if ((counts.falhas ?? []).length > 0) comFalha++;

      // `lastSyncedAt` e `lastReadingAt` são escritos dentro de
      // `ingestWithings`, com a data da leitura mais nova — aqui só contamos.
      /**
       * O sucesso **apaga** o erro anterior — e uma passagem com `falhas`
       * **não é sucesso** (achado do code review).
       *
       * Um erro que fica depois de resolvido mente tanto quanto um que nunca
       * aparece. Mas apagá-lo quando o ECG ou os vitais falharam é apagar a
       * única prova durável de que falharam: a lista nova vivia só numa linha
       * de consola e no JSON da resposta, e este ficheiro tem, vinte linhas
       * abaixo, um comentário a explicar que a consola do contentor não é lida
       * por ninguém — foi o que custou o manguito do Bruno.
       */
      /**
       * **A falha parcial tem coluna própria** (corrigido na 2ª rodada).
       *
       * Eu tinha escrito isto no `lastSyncError`, e o `lastSyncError` quer dizer
       * *"a sincronização falhou"*. Numa passagem em que o sono e a pressão
       * entraram e só o ECG falhou, a tela do paciente passava a dizer *"The
       * last sync failed: não lido: tracado-do-ecg"* — e essa pendência
       * **suprimia** o aviso de "o relógio está calado há N dias", que é o
       * único que o paciente pode resolver.
       *
       * `lastPartialRead` é para a clínica. O `lastSyncError` continua a ser só
       * para quando a passagem **falhou**.
       */
      const naoLidos = [...(counts.falhas ?? [])];
      await (prisma as any).wearableConnection
        .update({
          where: { id: c.id },
          data: {
            lastPartialRead: naoLidos.length ? naoLidos.join(",") : null,
            lastPartialReadAt: naoLidos.length ? new Date() : null,
            /*
             * O sucesso apaga o erro anterior. Um erro que fica depois de
             * resolvido mente tanto quanto um que nunca aparece.
             */
            ...(c.lastSyncError
              ? { lastSyncError: null, lastSyncErrorAt: null, needsReauthAt: null }
              : {}),
          },
        })
        .catch(() => {});
    } catch (err: any) {
      failed++;
      // One patient's expired token must not stop the other patients' sync.
      console.error(`[cron/wearables-sync] connection ${c.id}:`, err?.message);
      /**
       * **E grava, porque a consola nao e lida por ninguem.**
       *
       * A consola do contentor devolve as linhas do arranque e mais nada. Uma
       * falha que so existe la e uma falha que nao existe: a tela continua a
       * dizer "conectado", nenhum alerta dispara, e quem procura a leitura
       * descobre o problema dias depois — que foi o caso do manguito do Bruno.
       */
      await (prisma as any).wearableConnection
        .update({
          where: { id: c.id },
          data: {
            lastSyncError: String(err?.message ?? err).slice(0, 500),
            lastSyncErrorAt: new Date(),
          },
        })
        .catch(() => {});
    }

    /**
     * Quando a ligacao cai, **a clinica fica a saber** (114 T-7).
     *
     * O Bruno: *"se cair a conexao na conta do paciente, precisa aparecer uma
     * notificacao para o paciente e para a clinica dizendo que a conexao foi
     * perdida e que ele precisa reconectar."*
     *
     * Ate aqui nada acontecia. A ligacao emudecia e a unica forma de descobrir
     * era alguem abrir a tela e reparar — o que costuma ser quando ja se
     * precisava das leituras.
     *
     * Vai pela maquina que ja existe: uma linha em `Alert`, deduplicada pelo
     * dia, na tela que a clinica ja tem para isto. `createAlert` devolve
     * `created: false` quando o alerta do dia ja existia, e e isso que impede o
     * e-mail diario de virar ruido.
     *
     * **A releitura e deliberada.** `ingestWithings` acabou de escrever
     * `lastReadingAt`, e o objeto em memoria ficou velho — julgar o silencio
     * pelo valor antigo marcaria como muda uma ligacao que acabou de entregar.
     */
    try {
      const atual = await (prisma as any).wearableConnection.findUnique({
        where: { id: c.id },
        select: {
          status: true,
          lastReadingAt: true,
          createdAt: true,
          notifyCheckedAt: true,
          notifyConfirmedAppli: true,
        },
      });
      if (atual) await avisarSeCaiu(c.id, c.userId, atual);
    } catch (err: any) {
      // Um aviso que falha nao pode derrubar a sincronia — ela e o trabalho.
      console.error(`[cron/wearables-sync] aviso ${c.id}:`, err?.message);
    }
  }

  console.log(
    `[cron/wearables-sync]${ranOut ? " (orcamento esgotado)" : ""} ` +
      `connections=${connections.length} synced=${synced} withData=${withData} ` +
      `failed=${failed} subscriptionsChecked=${checked} | ` +
      /*
       * **Todos os contadores, e não só alguns.** O log do contentor é por onde
       * se lê isto em produção — descobri que o ECG tinha entrado indo lá, e só
       * lá — e um contador que falte aqui continua invisível para quem olha.
       */
      `bp=${totals.bloodPressure}/${totals.bloodPressureRead} ` +
      `atividade=${totals.activityDays} sono=${totals.sleepNights} ` +
      `vitais=${totals.vitalsDays} intraday=${totals.intradayDays} ` +
      `hipnograma=${totals.hypnogramNights} treinos=${totals.workouts} ` +
      `ecg=${totals.ecgRecords}/${totals.ecgRead} ` +
      `ecgNaoAtribuidos=${totals.ecgNaoAtribuidos} ` +
      /* Vazio é notícia boa, e é por isso que se escreve sempre. */
      `naoLidos=${[...totals.falhas].join(",") || "-"} comFalha=${comFalha}`
  );

  return ({
    connections: connections.length,
    ranOut,
    synced,
    withData,
    /* Ver `comFalha`: ligações com algo não lido, nem `withData` nem `failed`. */
    comFalha,
    failed,
    subscriptionsChecked: checked,
    /*
     * O `Set` virava `{}` no JSON — ou seja, invisível para quem chama a rota,
     * que é o caso de uso que fez este ficheiro ganhar um teste. Vai como
     * lista.
     */
    totals: { ...totals, falhas: [...totals.falhas] },
  });
}
