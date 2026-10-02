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
    select: { id: true, signal: true },
  });
  if (!existe) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const token = signFileToken(params.id, userId);

  return NextResponse.json({
    url: `${base}/api/patient/ecg/${params.id}/pdf?t=${encodeURIComponent(token)}`,
    /**
     * Se o traçado ainda não chegou, o PDF sai **sem** ele — com a conclusão do
     * aparelho e uma frase a dizer que o traçado não foi obtido. A tela usa
     * isto para avisar antes do toque, em vez de deixar a pessoa descobrir
     * depois de abrir.
     */
    temTracado: existe.signal !== null,
  });
}
