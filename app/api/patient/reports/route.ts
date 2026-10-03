export const dynamic = "force-dynamic";

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { signFileToken } from "@/lib/file-access-token";
import { patientOnlyWriteRefusal } from "@/lib/patient-only-write";
import {
  janelaEmDias,
  reaproveitarRelatorio,
  periodoDoRelatorio,
} from "@/lib/relatorio-a-pedido";

/**
 * Os relatórios desta pessoa (099 T-5).
 *
 * Ela abre o app e eles estão lá — **isso é ela buscar, não nós enviarmos**, e
 * é essa distinção que faz o produto existir sem quebrar a regra de que nada
 * automático chega a um paciente.
 *
 * A lista não traz o HTML: são dezenas de quilobytes cada, e a tela só precisa
 * saber que eles existem e de quando são.
 */
export async function GET() {
  /**
   * **O botão estava escondido e a porta aberta** (110 T-3).
   *
   * O item *My reports* no menu do app carrega `mod_records`; esta rota não
   * pedia módulo nenhum. Desligar *My Records* escondia o botão e a rota
   * continuava servindo os relatórios — e o menu do app **falha aberto**, então
   * não era preciso nem saber o caminho: bastava a chamada de permissões falhar.
   */
  const gate = await patientGate({ module: "mod_records" });
  if (gate.response) return gate.response;

  const reports = await (prisma as any).patientReport.findMany({
    // Os vazios ficam para a clínica: um relatório semanal dizendo "nada" é
    // pior que nenhum relatório.
    where: { patientId: gate.gate!.userId, hasData: true },
    /**
     * **A ordem é a de criação, não a do período** (120 T-7).
     *
     * Ordenava por `periodStart`. Um relatório a pedido cobre 90 dias por
     * omissão, logo o `periodStart` dele é de há três meses — e um semanal
     * gerado há duas semanas tem `periodStart` mais recente. A lista punha o
     * semanal **antes** do que a pessoa acabou de pedir.
     *
     * Carregar o botão e não ver o resultado no topo lê-se como *"não
     * funcionou"*, e a pessoa carrega outra vez.
     *
     * `createdAt` é a ordem em que ela os viu nascer, e é a que o
     * `reaproveitarRelatorio` já usa para escolher o último.
     */
    orderBy: { createdAt: "desc" },
    take: 52,
    select: {
      id: true,
      cadence: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      therapistNote: true,
      /*
       * **O resumo do conteúdo** (120 T-8), para a tela poder dizer que dois
       * relatórios são o mesmo papel. Eles podem coexistir — é escolha do
       * Bruno — e o que faltava era saber se não são iguais.
       */
      contentHash: true,
    },
  }).catch((e: any) => {
    /**
     * **Uma falha de leitura não é "ainda não há relatórios"** (120 T-1).
     *
     * Isto era `.catch(() => [])`, e a tela do paciente escrevia *"ainda não há
     * relatórios"* sobre uma lista que podia ter dez. É a mesma ausência
     * silenciosa que fez o ECG desaparecer do papel: o estado de falha e o
     * estado vazio eram a mesma resposta.
     *
     * `null` quer dizer *"não consegui ler"*; `[]` quer dizer *"não há"*.
     */
    console.error("[patient/reports] lista não pôde ser lida:", e?.message ?? e);
    return null;
  });

  if (reports === null) {
    return NextResponse.json(
      { error: "Could not load your reports right now", code: "reports_unavailable" },
      { status: 503 }
    );
  }

  // Cada um ja vem com o link que o navegador do telefone consegue abrir: o
  // bearer nao viaja para la, entao a permissao viaja no link (099 T-5).
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    reports: (reports as any[]).map((r) => ({
      ...r,
      url: `${base}/api/patient/reports/${r.id}?t=${signFileToken(r.id, gate.gate!.userId)}`,
    })),
  });
}

/**
 * O paciente pede um relatório dele, agora (118 T-5).
 *
 * > *"Quero poder gerar esses reports detalhados que servirão para os pacientes
 * > buscarem ajuda médica ou de outros profissionais quando quiserem. Mas isso
 * > vai depender de planos ou pagamento da clinic."* — Bruno
 *
 * ## A trava é a mesma porta, e fica aqui
 *
 * `mod_records` — o módulo cujo rótulo no app é literalmente *"Meus
 * relatórios"*, e que a lista e a leitura já pedem. Um terceiro conceito de
 * plano só para o botão criaria duas verdades sobre a mesma porta, e seria a
 * terceira vez que uma delas ficava aberta.
 *
 * **Esconder o botão não é fechar a porta.** Quando houver plano pago, ele liga
 * e desliga este mesmo interruptor; nada neste ficheiro muda.
 *
 * ## Cada pedido é um retrato novo
 *
 * A linha guarda o HTML de propósito — regerar faria o relatório de janeiro
 * mudar quando um dado de janeiro fosse corrigido em março, sem que quem leu o
 * primeiro soubesse. Por isso cada pedido cria uma linha, com o instante exacto
 * no `periodStart`: quem mediu ao meio-dia tem direito a um relatório que
 * inclua a medição do meio-dia.
 *
 * O tecto de dez minutos devolve **o último** em vez de um erro — é o que a
 * pessoa quer de qualquer maneira, e nove consultas pesadas por toque não é
 * forma de tratar o banco.
 */
export async function POST(req: NextRequest) {
  const gate = await patientGate({ module: "mod_records" });
  if (gate.response) return gate.response;

  /**
   * **O portão não basta** (achado do QA, 02/10).
   *
   * O `patientGate` devolve cedo para quem não é paciente — e essa saída está
   * **antes** da checagem de módulo. Ela existe para as rotas que o admin e o
   * portal dividem, como a triagem. Esta não é dividida com ninguém.
   *
   * Medido: um bearer de `THERAPIST` respondia **200**, saltava o `mod_records`
   * por inteiro, disparava as nove consultas pesadas, e deixava uma linha de
   * `PatientReport` cujo "paciente" era o terapeuta — que o painel da clínica
   * conta como relatório gerado.
   *
   * E a impersonação é o outro ramo: um admin a ver o portal carrega o papel do
   * paciente e passaria pela checagem seguinte. **Escreveria como ele.**
   *
   * É o mesmo guarda que a T-7 desta atividade já usa, e a foto de perfil, e as
   * submissões de exercício. Eu já tinha fechado este buraco uma vez hoje, na
   * T-7, e abri-o outra vez aqui — é por isso que a regra tem de ser um helper
   * chamado em toda a escrita do paciente, e não uma coisa que se lembra.
   */
  const recusa = patientOnlyWriteRefusal(gate.gate);
  if (recusa === "impersonation") {
    return NextResponse.json(
      {
        error: "Read-only during impersonation",
        errorPt: "Somente leitura durante a visualização",
        code: "impersonation_read_only",
      },
      { status: 403 }
    );
  }
  if (recusa === "not_patient") {
    return NextResponse.json(
      {
        error: "Only the patient asks for their own report.",
        errorPt: "Só o paciente pede o próprio relatório.",
        code: "patient_only",
      },
      { status: 403 }
    );
  }

  const userId = gate.gate!.userId;

  /* Um corpo ilegível é um pedido sem opções, não um erro. */
  const corpo = await req.json().catch(() => ({}));
  const dias = janelaEmDias((corpo as any)?.days);

  const ultimo = await (prisma as any).patientReport
    .findFirst({
      where: { patientId: userId, cadence: "ON_DEMAND" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    })
    .catch(() => null);

  const reaproveitado = reaproveitarRelatorio(ultimo);
  if (reaproveitado) {
    return NextResponse.json({
      id: reaproveitado,
      /*
       * **O quarto estado que faltava** (achado da 2ª rodada). Este ramo não
       * devolvia `igualAoAnterior` nenhum, logo quem lê a resposta via
       * `undefined` ao lado do `true | false | null` documentado. Aqui é
       * trivialmente o mesmo papel: é o próprio.
       */
      igualAoAnterior: true,
      /** Dito, e não escondido: a tela pode querer explicar porque é o mesmo. */
      reaproveitado: true,
      url: linkDoRelatorio(reaproveitado, userId),
    });
  }

  const quem = await prisma.user
    .findUnique({ where: { id: userId }, select: { clinicId: true, reportLanguage: true } })
    .catch(() => null);
  const clinicId = quem?.clinicId ?? null;
  if (!clinicId) {
    /* Sem clínica não há de onde sair um relatório — e não é um erro nosso. */
    return NextResponse.json({ error: "no_clinic" }, { status: 409 });
  }

  const { getPatientReportData, renderPatientReportHTML } = await import("@/lib/patient-report");
  const dados = await getPatientReportData(userId, { days: dias });
  if (!dados.patient) {
    /**
     * **404 só quando a pessoa não existe** (achado G3 do QA).
     *
     * O `lerOuFalhar` devolve `null` e nomeia `"paciente"` na lista. Isto
     * respondia **404 `not_found`** a quem acabou de carregar no botão do
     * próprio relatório — e ele existe, senão o `patientGate` não o teria
     * deixado chegar aqui. Uma falha transitória entre as duas leituras dizia
     * ao paciente que ele não existe.
     */
    if ((dados as any).naoLidos?.includes("paciente")) {
      return NextResponse.json(
        { error: "Could not read your details right now", code: "read_failed" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { inicio, fim } = periodoDoRelatorio(dias);

  /*
   * **`hasData` é sempre `true` aqui, e é a diferença entre os dois caminhos.**
   *
   * O cron marca `false` quando olhou e não havia nada, e a lista do paciente
   * esconde essas — *"um relatório semanal dizendo 'nada' é pior que nenhum
   * relatório"*. Mas este foi **pedido**: esconder a resposta de alguém que
   * carregou num botão é não responder, e a pessoa ficaria a carregar outra vez.
   * Um relatório que diz que o período esteve vazio é uma resposta.
   */
  /**
   * **Na língua do paciente** (achado do QA, 02/10).
   *
   * `User.reportLanguage` existe desde sempre e este documento ignorava-o: com
   * `"pt"` o HTML saía byte a byte igual ao inglês. O PDF do ECG e o da
   * avaliação corporal já o respeitavam; este não — e é precisamente este que o
   * paciente leva a um médico.
   */
  const html = renderPatientReportHTML(dados, {
    idioma: quem?.reportLanguage === "pt" ? "pt" : "en",
  });

  /**
   * **O resumo do conteúdo** (120 T-8).
   *
   * Dois relatórios do mesmo paciente **podem** coexistir — o `periodStart`
   * carrega a hora de propósito, para quem pede ao meio-dia não ficar preso ao
   * retrato das nove. O que faltava era saber *se não são iguais*, e dois papéis
   * iguais não se distinguem pela data nem pelo tamanho.
   */
  const resumoDoConteudo = createHash("sha256").update(html).digest("hex");

  /* O resumo do último a pedido, para a resposta poder dizer se mudou algo. */
  const resumoAnterior = await (prisma as any).patientReport
    .findFirst({
      /*
       * **Qualquer cadência, e não só o a pedido** (achado G10 do QA).
       *
       * Comparava só contra `ON_DEMAND`: o paciente cujo semanal chegou ontem e
       * que carrega no botão recebia `igualAoAnterior: null` mesmo quando o
       * papel era byte a byte igual ao semanal logo acima dele na lista — que é
       * a comparação com mais chance de importar.
       */
      where: { patientId: userId },
      orderBy: { createdAt: "desc" },
      select: { contentHash: true },
    })
    .then((r: any) => r?.contentHash ?? null)
    .catch(() => null);

  let criado: { id: string };
  try {
    criado = await (prisma as any).patientReport.create({
      data: {
        clinicId,
        patientId: userId,
        cadence: "ON_DEMAND",
        periodStart: inicio,
        periodEnd: fim,
        html,
        contentHash: resumoDoConteudo,
        hasData: true,
      },
      select: { id: true },
    });
  } catch (e: any) {
    /**
     * **Dois pedidos no mesmo milissegundo** (120 T-8).
     *
     * A chave é `(patientId, cadence, periodStart)` e o `periodStart` tem
     * precisão de milissegundo, logo a colisão é rara — mas real com dois
     * contentores a servir o mesmo paciente, e dava **500** a quem carregou no
     * botão. O tecto de dez minutos não a fecha: ele lê antes de qualquer um
     * dos dois ter escrito.
     *
     * O vencedor escreveu o mesmo papel. Devolver o dele é a resposta certa, e
     * é o mesmo comportamento do reaproveitamento, pelo mesmo motivo: para quem
     * pediu não faz diferença.
     */
    if (e?.code === "P2002") {
      const existente = await (prisma as any).patientReport
        .findFirst({
          where: { patientId: userId, cadence: "ON_DEMAND", periodStart: inicio },
          /* O resumo também: o `igualAoAnterior` tem de ser **medido**. */
          select: { id: true, contentHash: true },
        })
        .catch(() => null);
      if (existente) {
        return NextResponse.json({
          id: existente.id,
          reaproveitado: true,
          /*
           * **Comparado, e não afirmado** (achado da 2ª rodada do review).
           *
           * Isto era `igualAoAnterior: true` fixo — e o campo é documentado como
           * *"o HTML bate byte a byte"*. Neste ramo nada tinha sido comparado: o
           * `existente` vinha com `select: { id: true }`. Era uma alegação sobre
           * o conteúdo, feita sem olhar para o conteúdo, num campo que existe
           * precisamente para o Bruno não ter de comparar à vista.
           */
          igualAoAnterior:
            existente.contentHash == null
              ? null
              : existente.contentHash === resumoDoConteudo,
          url: linkDoRelatorio(existente.id, userId),
        });
      }
    }
    throw e;
  }

  return NextResponse.json({
    id: criado.id,
    reaproveitado: false,
    /**
     * **Se este papel é igual ao anterior.**
     *
     * A resposta do Bruno à T-8: *"podem sim existir, só preciso saber se não
     * são iguais"*. `true` quer dizer que o HTML bate byte a byte com o do
     * último a pedido; `false` que mudou algo. `null` quando não havia anterior,
     * ou quando o anterior é de antes desta coluna existir — e `null` **não**
     * quer dizer "igual".
     */
    igualAoAnterior:
      resumoAnterior === null ? null : resumoAnterior === resumoDoConteudo,
    dias,
    url: linkDoRelatorio(criado.id, userId),
  });
}

/**
 * O link que o navegador do telemóvel consegue abrir.
 *
 * O bearer da app não viaja para lá, então a permissão viaja no link —
 * assinada, presa a um relatório, a uma pessoa e a cinco minutos. É a mesma
 * peça do ECG e das faturas.
 */
function linkDoRelatorio(id: string, userId: string): string {
  const base = (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://bpr.clinic"
  ).replace(/\/$/, "");
  return `${base}/api/patient/reports/${id}?t=${signFileToken(id, userId)}`;
}
