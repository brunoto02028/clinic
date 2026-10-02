export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { signFileToken } from "@/lib/file-access-token";
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
    orderBy: { periodStart: "desc" },
    take: 52,
    select: {
      id: true,
      cadence: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      therapistNote: true,
    },
  }).catch(() => []);

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
      /** Dito, e não escondido: a tela pode querer explicar porque é o mesmo. */
      reaproveitado: true,
      url: linkDoRelatorio(reaproveitado, userId),
    });
  }

  const { clinicId } = (await prisma.user
    .findUnique({ where: { id: userId }, select: { clinicId: true } })
    .catch(() => null)) ?? { clinicId: null };
  if (!clinicId) {
    /* Sem clínica não há de onde sair um relatório — e não é um erro nosso. */
    return NextResponse.json({ error: "no_clinic" }, { status: 409 });
  }

  const { getPatientReportData, renderPatientReportHTML } = await import("@/lib/patient-report");
  const dados = await getPatientReportData(userId, { days: dias });
  if (!dados.patient) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
  const criado = await (prisma as any).patientReport.create({
    data: {
      clinicId,
      patientId: userId,
      cadence: "ON_DEMAND",
      periodStart: inicio,
      periodEnd: fim,
      html: renderPatientReportHTML(dados),
      hasData: true,
    },
    select: { id: true },
  });

  return NextResponse.json({
    id: criado.id,
    reaproveitado: false,
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
