export const dynamic = "force-dynamic";

/**
 * O link assinado do PDF do ECG, emitido **no momento do toque** (099 T-9).
 *
 * ## Porque não vem junto com a lista
 *
 * Seria mais barato mandar o link dentro de `/api/wearables/data` e poupar uma
 * ida ao servidor. Só que o token vive **minutos**, e a lista é carregada
 * quando a tela abre: quem a lê, deixa o telemóvel de lado e volta dez minutos
 * depois tocaria num link já morto — e o que veria seria um erro, não um PDF.
 *
 * O `My reports` faz assim e aceita essa falha. Aqui não: um botão que só
 * funciona se a pessoa for rápida é um botão que ensina a não confiar nele.
 *
 * ## O token prova uma coisa só
 *
 * Que **aquela pessoa** pode abrir **aquela gravação**. Está assinado, expira,
 * e não serve para mais nada. É a mesma peça que os documentos e as faturas já
 * usam, pela mesma razão: o navegador do telemóvel não carrega o bearer da app.
 */

import { NextRequest, NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { signFileToken } from "@/lib/file-access-token";
import { prisma } from "@/lib/db";
import { temTracado } from "@/lib/ecg-tem-sinal";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;
  const userId = __gate.gate.userId;

  /*
   * Confirma-se que a gravação é dela **antes** de assinar. Assinar primeiro e
   * verificar depois seria emitir uma chave e só então perguntar de quem é a
   * porta.
   */
  const existe = await prisma.ecgRecording.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!existe) return NextResponse.json({ error: "not_found" }, { status: 404 });

  /*
   * `signal: true` trazia as 9.000 amostras — ~40 KB — do banco para a
   * aplicação a cada toque, só para as comparar com `null`. Ver
   * `lib/ecg-tem-sinal.ts`.
   */
  const comTracado = await temTracado(userId, params.id);

  /*
   * O mesmo `base` que os documentos e as faturas usam, **incluindo o corte da
   * barra final**.
   *
   * Aqui estava `|| ""`, que com as duas variáveis em falta devolvia um URL
   * relativo. Em produção não morde — medido: `urlBase` é `https://bpr.clinic` —
   * e a barra a dobrar também não parte (`//api/...` responde 308 com a query
   * intacta). Mas três rotas que emitem a mesma espécie de link não deviam ter
   * três respostas diferentes para a mesma variável em falta, e um ambiente novo
   * sem `NEXTAUTH_URL` é onde a diferença aparece.
   */
  const base = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://bpr.clinic")
    .replace(/\/$/, "");
  const token = signFileToken(params.id, userId);

  return NextResponse.json({
    url: `${base}/api/patient/ecg/${params.id}/pdf?t=${encodeURIComponent(token)}`,
    /**
     * Se o traçado ainda não chegou, o PDF sai **sem** ele — com a conclusão do
     * aparelho e uma frase a dizer que o traçado não foi obtido.
     *
     * **Avisar antes do toque é trabalho de outra rota.** Este campo chega com a
     * resposta do link, que é pedida *no* toque — tarde para evitar a surpresa.
     * Quem avisa a tempo é o `/api/wearables/data`, que manda a lista e agora
     * manda isto com ela. Aqui fica porque é a resposta sobre *esta* gravação no
     * instante em que ela vai ser aberta, e a lista pode ter minutos.
     */
    temTracado: comTracado,
  });
}
