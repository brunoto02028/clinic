export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * A sondagem, corrida em produção (119 T-1).
 *
 * ## Porque é uma rota de cron e não de admin
 *
 * Isto precisa de correr **em produção**, porque é lá que vivem os tokens. Uma
 * rota de admin exigiria uma sessão de admin de produção, que eu não tenho — e
 * pedir ao Bruno que faça login às cinco da manhã para eu medir uma coisa é
 * trocar o trabalho dele pelo meu.
 *
 * O segredo do cron já existe, já protege oito rotas, e é passado por `?key=`.
 * O mesmo caminho, a mesma guarda.
 *
 * ## O que ela escreve, e o que não escreve
 *
 * **Não escreve dado de saúde nenhum.** Nem um ponto, nem uma série, nem um
 * ECG. Medir não pode alterar o que está a ser medido — se a sondagem gravasse,
 * a execução seguinte estaria a medir a anterior.
 *
 * **Mas escreve uma coisa, e dizer que não escrevia era falso:** se o token
 * estiver a expirar, o `withingsAccessToken` renova-o e grava o par novo. Os
 * refresh tokens da Withings são de **uso único**, portanto duas renovações
 * sobrepostas — esta e a do `wearables-sync` — deixam a ligação do paciente a
 * precisar de reautorização. Por uma medição.
 *
 * Por isso a sondagem **só renova quando não há alternativa**, e diz no
 * resultado se o fez. Correr com o token fresco não toca em nada.
 *
 * O token **é desembrulhado e renovado se precisar**, e isto mudou de ideia a
 * meio: a primeira versão recusava renovar, argumentando que um token expirado
 * era um achado legítimo. É, para uma sondagem de *saúde da ligação* — mas a
 * pergunta aqui é outra: *o que o plano devolve*. Com o token morto, todas as
 * linhas diriam `erro` e eu não aprendia nada sobre o plano. A renovação fica,
 * e o relatório diz se ela foi precisa.
 *
 * E o token está **cifrado em repouso** (`lib/crypto-at-rest.ts`), por isso nem
 * havia como o usar cru: mandá-lo assim daria erro de autenticação em tudo, e
 * eu teria lido isso como "não tenho direito a nada".
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withingsAccessToken } from "@/lib/withings";
import { sondarTudo, tabelaDaSondagem } from "@/lib/withings-sondagem";

/**
 * **O segredo desta rota, e porque não é o do cron** (120 T-2).
 *
 * Isto validava contra `CRON_SECRET || NEXTAUTH_SECRET`, que é o padrão de 19
 * rotas de cron. Mas as outras **disparam trabalho**; esta devolve fases do
 * sono, VFC, FC de repouso, SpO₂ e passos de **qualquer** `?email=`, sem
 * recorte de clínica.
 *
 * Sem `CRON_SECRET` definido, a chave válida era o **segredo de assinatura de
 * sessão** — a viajar num URL: log do Coolify, log do proxy, histórico de
 * shell, e a conversa onde o `curl` foi colado.
 *
 * Agora: `WEARABLES_PROBE_SECRET`, de preferência em **header**. O
 * `NEXTAUTH_SECRET` nunca é chave válida, nem como recurso.
 */
const SEGREDO_DA_SONDAGEM = () => process.env.WEARABLES_PROBE_SECRET || null;

/**
 * Quem pode ser sondado, por e-mail (`WEARABLES_PROBE_EMAILS`, vírgulas).
 *
 * **Vazia fecha a porta**, e é de propósito: esta rota lê o prontuário de uma
 * pessoa nomeada, e o estado por omissão de uma porta assim é fechada. A
 * pergunta a que ela serve — *"o número passou a chegar?"* — nunca precisa de
 * mais do que as contas de teste.
 */
const EMAILS_PERMITIDOS = (): string[] =>
  (process.env.WEARABLES_PROBE_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const PODE_SONDAR = (email: string) =>
  EMAILS_PERMITIDOS().includes(email.trim().toLowerCase());

export async function POST(req: NextRequest) {
  const segredo = SEGREDO_DA_SONDAGEM();
  if (!segredo) {
    return NextResponse.json(
      {
        error: "esta rota precisa de WEARABLES_PROBE_SECRET",
        porque:
          "ela lê dados de saúde de uma pessoa nomeada; o segredo do cron é o " +
          "mesmo que assina as sessões, e não serve para isto",
      },
      { status: 503 }
    );
  }

  const noHeader = req.headers.get("x-probe-secret");
  const naQuery = req.nextUrl.searchParams.get("key");
  if (noHeader !== segredo && naQuery !== segredo) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (noHeader !== segredo && naQuery === segredo) {
    /*
     * Funciona, e avisa. Um segredo em query string fica no log de acesso do
     * proxy e no histórico de quem o colou; o header não.
     */
    console.warn(
      "[sondagem] segredo recebido em query string — preferir o header x-probe-secret"
    );
  }

  /**
   * `?listar=1` — quem tem ligação Withings, e com que aparelho.
   *
   * Existe para responder a uma pergunta de plano, não de pessoa: *o traçado do
   * ECG depende do Withings+ do paciente, ou do nosso pacote na API?* Só se
   * decide medindo alguém **sem** assinatura, e para isso é preciso saber quem
   * há.
   *
   * Devolve **só metadados** — nunca uma medição, nunca um valor de saúde. O
   * e-mail vem truncado: dá para o Bruno reconhecer quem é sem que a lista seja
   * um despejo de contactos.
   */
  if (req.nextUrl.searchParams.get("listar") === "1") {
    /**
     * **A lista também é só de quem pode ser sondado** (achado F2 do QA).
     *
     * Eu declarei esta rota fechada por omissão e ela não estava: o guarda da
     * lista de e-mails ficou **depois** deste ramo, logo `?listar=1` devolvia 50
     * ligações de **todos** os inquilinos — domínio inteiro, primeiro nome,
     * estado e quantos ECG cada um tem. Com a `WEARABLES_PROBE_EMAILS` vazia, o
     * `?pontos=1` dava 403 e isto dava 200.
     *
     * `nome: "Bruno T."` mais `ecgsGuardados: 4` já identifica um paciente de
     * outra clínica. A porta tinha de fechar do mesmo lado.
     */
    const permitidos = EMAILS_PERMITIDOS();
    if (permitidos.length === 0) {
      return NextResponse.json(
        {
          error: "a lista de sondagem está vazia",
          comoPermitir: "definir WEARABLES_PROBE_EMAILS (vírgulas) no ambiente",
        },
        { status: 403 }
      );
    }

    /*
     * **Uma consulta só, cruzada por `userId`.**
     *
     * A primeira versão fazia duas consultas quase iguais e juntava-as por
     * e-mail — o que colapsaria duas ligações que partilhem e-mail numa linha
     * só, e numa clínica onde um responsável gere outra pessoa isso não é
     * hipótese teórica. O `userId` é a chave, e já vem na mesma consulta.
     */
    const ligacoes = await prisma.wearableConnection.findMany({
      /*
       * **E só de quem está na lista.**
       *
       * `equals` + `mode: "insensitive"` por e-mail, e não um `in`: o `in` do
       * Prisma compara byte a byte, e o e-mail guardado pode ter maiúsculas que
       * a lista do env não tem. Um recorte que falhasse por uma maiúscula
       * devolveria lista vazia, e eu leria isso como "não há ninguém".
       */
      where: {
        provider: "WITHINGS",
        user: {
          OR: permitidos.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })),
        },
      },
      select: {
        userId: true,
        status: true,
        isClinicDevice: true,
        lastSyncedAt: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    /* Quantos ECG cada um tem — é o que diz se o relógio sequer faz ECG. */
    const contagens = await prisma.ecgRecording.groupBy({
      by: ["userId"],
      /* Recortada pelos mesmos utilizadores: era **global**, sobre todo o banco. */
      where: { userId: { in: ligacoes.map((l) => l.userId) } },
      _count: { _all: true },
    });
    const ecgsPorUser = new Map(contagens.map((c) => [c.userId, c._count._all]));

    return NextResponse.json({
      quantas: ligacoes.length,
      ligacoes: ligacoes.map((l) => {
        const email = l.user?.email ?? "";
        const [antes, dominio] = email.split("@");
        return {
          quem: `${(antes ?? "").slice(0, 4)}…@${dominio ?? "?"}`,
          nome: `${l.user?.firstName ?? ""} ${(l.user?.lastName ?? "").slice(0, 1)}.`.trim(),
          status: l.status,
          aparelhoDaClinica: l.isClinicDevice,
          ultimaSincronizacao: l.lastSyncedAt,
          /**
           * Zero aqui costuma querer dizer *"o relógio dele não faz ECG"* — e
           * é por isso que esta coluna existe: um vazio na sondagem de alguém
           * sem aparelho de ECG não distingue "sem direito" de "sem aparelho",
           * e serviria para concluir a coisa errada.
           */
          ecgsGuardados: ecgsPorUser.get(l.userId) ?? 0,
        };
      }),
    });
  }

  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "diga de quem: ?email=... — ou ?listar=1 para ver quem há" },
      { status: 400 }
    );
  }

  /**
   * **Quantas pessoas têm este e-mail, e qual delas é esta.**
   *
   * Era um `findFirst` sem ordem nenhuma. O mesmo e-mail pode ter linha em mais
   * de uma clínica — a do Bruno tem uma de teste e uma real —, e sem `orderBy`
   * o banco pode devolver uma ou outra entre duas chamadas. Aconteceu em
   * 02/10/2026: a mesma sondagem trouxe 4 ECG e, minutos depois, zero.
   *
   * Duas coisas mudam: a ordem passa a ser determinística, e a resposta diz
   * **quantas** linhas partilham o e-mail e qual o `userId` escolhido. Uma
   * ferramenta de prova que não diz de quem está a falar prova o quê?
   */
  /*
   * **A lista de quem pode ser sondado** (120 T-2). Antes era *qualquer*
   * e-mail, de qualquer clínica — o segredo do cron funcionava como
   * chave-mestra do prontuário de todos os inquilinos.
   */
  if (!PODE_SONDAR(email)) {
    return NextResponse.json(
      {
        error: "este e-mail não está na lista de sondagem",
        comoPermitir: "acrescentar o e-mail a WEARABLES_PROBE_EMAILS (vírgulas)",
      },
      { status: 403 }
    );
  }

  const candidatos = await prisma.user.findMany({
    /* Sem depender de maiúsculas, pelo mesmo motivo do `?listar=1`. */
    where: { email: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, createdAt: true, clinicId: true },
  });
  const user = candidatos[0];
  if (!user) return NextResponse.json({ error: "não achei essa pessoa" }, { status: 404 });

  /**
   * `?pontos=1` — **o que nós guardámos**, ao lado do que a API devolve.
   *
   * A sondagem mostrava o que a Withings manda; não havia como ver o que ficou
   * no banco sem uma sessão de paciente. Isso deixava sem resposta a pergunta
   * que mais importa depois de uma correcção de campo: *"o número passou a
   * chegar?"*
   *
   * A VFC esteve sempre vazia porque pedíamos `sdnn_1` ao endpoint errado. A
   * correcção é de uma linha; a **prova** de que ela serviu é esta.
   *
   * Leitura, e só leitura. Nenhum dado de saúde identificável sai: por dia, o
   * valor de cada métrica — que é o mesmo que o próprio paciente vê na app.
   *
   * **Fica antes do token, de propósito.** Isto não fala com a Withings, e os
   * refresh tokens deles são de **uso único**: pedir um para ler o nosso próprio
   * banco arriscava deixar a ligação do paciente a precisar de reautorização por
   * causa de uma consulta que nem sai daqui.
   */
  if (req.nextUrl.searchParams.get("pontos") === "1") {
    const pontos = await prisma.wearableDataPoint.findMany({
      where: { userId: user.id },
      orderBy: { dataDate: "desc" },
      take: 40,
      select: {
        dataType: true,
        dataDate: true,
        sleepDuration: true,
        deepMinutes: true,
        remMinutes: true,
        lightMinutes: true,
        hrv: true,
        restingHr: true,
        spo2: true,
        steps: true,
      },
    });

    const ecgs = await prisma.ecgRecording.findMany({
      where: { userId: user.id },
      orderBy: { recordedAt: "desc" },
      take: 10,
      select: {
        recordedAt: true,
        conclusao: true,
        heartRate: true,
        samplingHz: true,
        wearPosition: true,
        deviceModel: true,
        deviceName: true,
        signalId: true,
        id: true,
      },
    });

    /*
     * Quais têm traçado, **sem trazer o traçado**: uma consulta só, por `id`.
     * Selecionar `signal` aqui eram 9.000 números × 10 gravações para
     * responder a um booleano — o mesmo desperdício que o `jaTemSinal` da
     * ingestão existe para evitar.
     */
    const { quaisTemTracado } = await import("@/lib/ecg-tem-sinal");
    const comTracado = await quaisTemTracado(
      user.id,
      ecgs.map((e: any) => e.id)
    );

    /**
     * **Quantos dias**, e não quantas linhas.
     *
     * Era `pontos.filter(...).length` sobre as 40 linhas mais recentes. A
     * ingestão escreve até três baldes por dia (`SLEEP`, `ACTIVITY`,
     * `VITALS`), logo o número dizia linhas e chamava-se dias — e 40 linhas são
     * ~13 dias, não 40.
     */
    const quantosDias = (campo: string) =>
      new Set(
        pontos
          .filter((p: any) => typeof p[campo] === "number")
          .map((p: any) => String(p.dataDate).slice(0, 10))
      ).size;

    return NextResponse.json({
      quem: user.email,
      /* Qual das linhas com este e-mail, e quantas há — ver a nota acima. */
      userId: user.id,
      clinicId: user.clinicId ?? null,
      quantasPessoasComEsteEmail: candidatos.length,
      quando: new Date().toISOString(),
      quantosDias: {
        sono: quantosDias("sleepDuration"),
        fasesDoSono: quantosDias("deepMinutes"),
        hrv: quantosDias("hrv"),
        fcRepouso: quantosDias("restingHr"),
        spo2: quantosDias("spo2"),
        passos: quantosDias("steps"),
      },
      linhas: pontos.length,
      pontos,
      /*
       * **A conclusão não sai desta rota, e a trava é aqui.**
       *
       * `"fibrilacao"` de uma pessoa nomeada por e-mail é o dado mais sensível
       * que este produto tem. A pergunta a que a rota existe para responder é
       * *"o ECG chegou?"*, e o `temTracado` responde-a.
       *
       * O comentário que dizia isto estava **dentro do `select`**, onde a
       * `conclusao` já não é pedida — e quem o lesse concluiria que a trava
       * estava ali, e podia tirar este destructuring. Apanhado pelo code review.
       *
       * Com ela apenas fora do `select`, uma mutação que a acrescentasse de
       * volta passava verde — o teste não vê o pedido, vê a resposta. A trava
       * fica na **saída**, que é o sítio onde a regra vale: nenhuma conclusão
       * clínica de uma pessoa nomeada sai desta rota, independentemente do que
       * a consulta trouxer.
       */
      ecgs: ecgs.map(({ id, conclusao, ...e }: any) => ({
        ...e,
        /*
         * **`temTracado`, a sério.** Esta linha era `temTracado: undefined` —
         * uma chave que o `JSON.stringify` descarta —, e o comentário ao lado
         * dizia *"só se ele existe"*. A rota cuja única função é dizer
         * "chegou?" não dizia nada sobre o traçado.
         */
        temTracado: comTracado.has(id),
      })),
    });
  }


  /* O provedor é guardado em maiúsculas — "withings" não encontra nada. */
  const ligacao = await prisma.wearableConnection.findFirst({
    where: { userId: user.id, provider: "WITHINGS" },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      status: true,
      isClinicDevice: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!ligacao?.accessToken) {
    return NextResponse.json(
      { error: "essa pessoa não tem ligação Withings com token" },
      { status: 404 }
    );
  }

  const expirado = ligacao.tokenExpiresAt
    ? new Date(ligacao.tokenExpiresAt).getTime() - Date.now() < 60_000
    : true;

  let token: string;
  try {
    token = await withingsAccessToken(ligacao, "sondagem");
  } catch (e: any) {
    /* Não dá para perguntar nada — e isso é uma resposta, não um 500. */
    return NextResponse.json(
      {
        error: "não foi possível obter um token utilizável",
        detalhe: String(e?.message ?? e),
        ligacao: {
      status: ligacao.status ?? null,
      /** Estava expirado quando chegámos — foi renovado para poder perguntar. */
      tokenPrecisouRenovar: expirado,
      aparelhoDaClinica: ligacao.isClinicDevice,
    },
      },
      { status: 409 }
    );
  }

  /**
   * `?sinal=<signalid>` — **o `with_filtered` é honrado?**
   *
   * A nossa chamada pede `with_filtered: "1"` com este raciocínio: o PDF deles é
   * visivelmente limpo e o rodapé diz *"Enhanced Filter, Main filter"*, logo é
   * improvável que seja o sinal cru. Mas isso era **inferência**, nunca medida.
   * A documentação só diz *"Request filtered version of the signal"* e não diz
   * que filtro é, nem o que acontece se não tivermos direito a ele.
   *
   * Se não for honrado, imprimimos o sinal cru num papel que vai para um médico
   * — com ruído de rede por cima, que é um ECG que o médico devolve. E a
   * diferença não se vê daqui: as duas respostas têm a mesma forma.
   *
   * Compara-se pedindo as duas versões do **mesmo** `signalid`. Devolve só
   * **estatística**: quantas amostras, os extremos, e quanta energia há acima de
   * 40 Hz — onde vive o ruído de 50/60 Hz da rede eléctrica e onde um ECG tem
   * pouco que seja. Nenhuma amostra sai na resposta.
   */
  const signalid = req.nextUrl.searchParams.get("sinal");
  if (signalid) {
    const { sinalDoEcg } = await import("@/lib/withings-series");
    const medir = async (filtrado: boolean) => {
      try {
        const s = await sinalDoEcg(token, signalid, filtrado);
        const bons = s.amostras.filter((v): v is number => typeof v === "number");
        /*
         * A energia da diferença entre amostras vizinhas cresce com a
         * frequência. É um passa-alto de uma linha, e chega para dizer se uma
         * das versões vem mais lisa do que a outra — não pretende ser análise
         * espectral.
         */
        let soma = 0;
        for (let i = 1; i < bons.length; i++) soma += (bons[i] - bons[i - 1]) ** 2;
        return {
          amostras: s.amostras.length,
          buracos: s.amostras.length - bons.length,
          frequencia: s.frequencia,
          posicao: s.posicao,
          minUv: bons.length ? Math.min(...bons) : null,
          maxUv: bons.length ? Math.max(...bons) : null,
          /** Raiz da média do quadrado da diferença — quanto mais alto, mais áspero. */
          asperezaUv: bons.length > 1 ? Math.sqrt(soma / (bons.length - 1)) : null,
          chavesDoCorpo: Object.keys(s.bruto ?? {}),
        };
      } catch (e: any) {
        return { erro: String(e?.message ?? e) };
      }
    };

    const comFiltro = await medir(true);
    /* Onze segundos entre as duas: o limite deles é por minuto e é nosso. */
    await new Promise((r) => setTimeout(r, 11_000));
    const semFiltro = await medir(false);

    return NextResponse.json({
      quem: user.email,
      signalid,
      quando: new Date().toISOString(),
      comFiltro,
      semFiltro,
      /**
       * `true` só quando as duas respostas são **mensuravelmente diferentes**.
       * Iguais querem dizer que o parâmetro não fez nada — e aí o papel está a
       * imprimir o cru, e o comentário do `sinalDoEcg` tem de dizer isso.
       */
      oFiltroFezAlgumaCoisa:
        "asperezaUv" in comFiltro &&
        "asperezaUv" in semFiltro &&
        comFiltro.asperezaUv != null &&
        semFiltro.asperezaUv != null &&
        Math.abs(comFiltro.asperezaUv - semFiltro.asperezaUv) > 0.5,
    });
  }

  const linhas = await sondarTudo(token);

  /*
   * Para o log do contentor, que é como isto se lê sem sessão nenhuma — e fica
   * registado com a data, porque a resposta muda no dia em que o plano mudar.
   */
  /*
   * **O `userId`, e não o e-mail** (achado do code review). O log do contentor
   * não é o sítio de um e-mail de paciente, e o `userId` identifica melhor:
   * dois utilizadores podem partilhar o e-mail e só um é o que foi sondado.
   */
  console.log(`[sondagem] === user ${user.id} — ${new Date().toISOString()} ===`);
  console.log(`[sondagem] ligação: ${ligacao.status ?? "?"}, precisou renovar: ${expirado}`);
  console.log(tabelaDaSondagem(linhas));

  return NextResponse.json({
    quem: user.email,
    quando: new Date().toISOString(),
    ligacao: {
      status: ligacao.status ?? null,
      /** Estava expirado quando chegámos — foi renovado para poder perguntar. */
      tokenPrecisouRenovar: expirado,
      aparelhoDaClinica: ligacao.isClinicDevice,
    },
    /** Um resumo para quem lê de relance, antes da tabela inteira. */
    resumo: {
      veio: linhas.filter((l) => l.desfecho === "veio").length,
      vazio: linhas.filter((l) => l.desfecho === "vazio").length,
      erro: linhas.filter((l) => l.desfecho === "erro").length,
    },
    sondagem: linhas,
  });
}
