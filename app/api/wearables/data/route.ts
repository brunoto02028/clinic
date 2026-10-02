export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';
import { lerEcg } from '@/lib/ecg-record';
import { MAXIMO_DE_ECGS, cortouRegistos, ateAoLimite } from '@/lib/ecg-limite';
import { quaisTemTracado } from '@/lib/ecg-tem-sinal';

export async function GET(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '30');
  const dataType = request.nextUrl.searchParams.get('type') || undefined;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const dataPoints = await (prisma as any).wearableDataPoint.findMany({
    where: {
      userId: eff.userId,
      dataDate: { gte: sinceStr },
      ...(dataType ? { dataType } : {}),
    },
    orderBy: { dataDate: 'desc' },
  });

  /**
   * O ECG chega lido (099 T-1).
   *
   * O ponto guarda a conclusao do aparelho dentro de `rawPayload`, e nenhuma
   * tela abria esse JSON — entao o ECG existia no banco e em lugar nenhum. A
   * rota entrega o registro ja lido, e as telas so mostram.
   *
   * `rawPayload` nao sai daqui: o que a tela precisa e a conclusao, e mandar o
   * JSON inteiro convidaria cada tela a interpretar por conta propria.
   */
  const comEcg = dataPoints.map((p: any) => {
    const { rawPayload, ...resto } = p;
    const ecg = lerEcg(p);
    return ecg ? { ...resto, ecg } : resto;
  });

  /**
   * Os ECG, **um por gravação** (119 T-2).
   *
   * Vêm de uma tabela própria porque um ECG é um evento e não um total do dia.
   * A lista acima continua a trazer os pontos diários — e um ECG antigo ainda
   * pode estar lá, em `data[].ecg`, enquanto o backfill não o trouxe. A tela
   * lê **esta** lista; a outra fica para não quebrar nada que já esteja no ar.
   */
  /*
   * `MAXIMO + 1` de propósito: a lista é cortada no tecto, e o registo extra
   * serve só para saber se houve corte — e dizê-lo. O painel usa o mesmo
   * número, senão as duas telas contariam diferente para o mesmo período.
   */
  const ecgsVieram = await prisma.ecgRecording.findMany({
    where: { userId: eff.userId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: MAXIMO_DE_ECGS + 1,
    select: {
      id: true,
      recordedAt: true,
      heartRate: true,
      conclusao: true,
      signalId: true,
    },
  });
  const ecgs = ateAoLimite(ecgsVieram);

  /*
   * **Quais têm traçado, dito aqui e não no toque.**
   *
   * O botão "Abrir em PDF" prometia avisar antes do toque que o traçado podia
   * não estar lá, e não tinha como: o `temTracado` só vinha na resposta do link,
   * que é pedida *no* toque. O comentário estava à frente do código.
   *
   * A pergunta é um booleano e custa um booleano — não as 9.000 amostras. Ver
   * `lib/ecg-tem-sinal.ts`.
   */
  const comTracado = await quaisTemTracado(
    eff.userId,
    ecgs.map((e) => e.id)
  );

  return NextResponse.json({
    data: comEcg,
    /** Houve mais do que cabe — a tela diz, em vez de cortar calada. */
    ecgsCortados: cortouRegistos(ecgsVieram.length),
    ecgRecordings: ecgs.map((e) => ({
      id: e.id,
      /* O instante. O dia é de quem mostra — ver o comentário no schema. */
      recordedAt: e.recordedAt.toISOString(),
      heartRate: e.heartRate,
      conclusao: e.conclusao,
      /* O caminho até ao sinal, não o sinal. */
      signalId: e.signalId,
      /**
       * Se o papel sai com traçado ou só com a conclusão do aparelho.
       *
       * `signalId` não serve para isto: ele diz que a Withings **tem** o sinal,
       * não que nós o fomos buscar — e entre as duas coisas há uma chamada que
       * pode ter falhado, ou um plano que pode não nos dar acesso.
       */
      temTracado: comTracado.has(e.id),
    })),
  });
}
