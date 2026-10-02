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

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    /*
     * **Uma consulta só, cruzada por `userId`.**
     *
     * A primeira versão fazia duas consultas quase iguais e juntava-as por
     * e-mail — o que colapsaria duas ligações que partilhem e-mail numa linha
     * só, e numa clínica onde um responsável gere outra pessoa isso não é
     * hipótese teórica. O `userId` é a chave, e já vem na mesma consulta.
     */
    const ligacoes = await prisma.wearableConnection.findMany({
      where: { provider: "WITHINGS" },
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

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "não achei essa pessoa" }, { status: 404 });

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
    token = await withingsAccessToken(ligacao);
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
  console.log(`[sondagem] === ${user.email} — ${new Date().toISOString()} ===`);
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
