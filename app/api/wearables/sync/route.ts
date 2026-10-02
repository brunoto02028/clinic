export const dynamic = 'force-dynamic';

import { patientGate } from "@/lib/patient-gate";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { owSyncUser } from '@/lib/open-wearables';
import { ingestWithings } from '@/lib/withings-ingest';
import { getEffectiveUser } from '@/lib/get-effective-user';

/**
 * As ligações com uma sincronização a decorrer **neste processo**.
 *
 * Ver o comentário no corpo do `POST`: existe porque o QA mediu cinco pedidos
 * simultâneos do mesmo paciente a entrarem todos no ingest.
 */
const emCurso = new Set<string>();

export async function POST(request: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_devices" });
  if (__gate.response) return __gate.response;

  const eff = await getEffectiveUser();
  if (!eff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /*
   * **Um corpo malformado é um 400, não um 500 sem corpo.**
   *
   * Era `await request.json()` seco e `provider.toUpperCase()` a seguir: um
   * `{}` ou um corpo não-JSON davam 500 com corpo vazio — a resposta que menos
   * ajuda quem está a depurar. Deixou de ser um botão raro e passou a ser
   * chamada por conta própria ao entrar na aba Saúde (119 T-8).
   */
  const corpo = await request.json().catch(() => null);
  const provider = typeof corpo?.provider === "string" ? corpo.provider : null;
  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }
  const userId = eff.userId;

  const connection = await (prisma as any).wearableConnection.findFirst({
    where: { userId, provider: provider.toUpperCase(), status: 'CONNECTED' },
  });

  if (!connection) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  // Withings we read ourselves, so a sync is a real fetch that returns counts
  // rather than an instruction for someone else to do it later.
  if (provider.toLowerCase() === 'withings') {
    /**
     * **Uma sincronização de cada vez, por ligação** (119 T-8, achado do QA).
     *
     * O QA disparou seis POSTs no mesmo instante, do mesmo paciente, e **cinco
     * entraram no ingest e falaram com a `wbsapi.withings.net` cada uma por si**
     * — cerca de 65 chamadas num segundo, de **uma** pessoa, contra um tecto
     * publicado de 120 por minuto partilhado por todos os pacientes.
     *
     * A sexta só levou 404 porque a primeira já tinha virado o `status` para
     * `ERROR`: serialização acidental, e só no caminho de falha.
     *
     * Até agora o único tecto estava no cliente — e **um tecto que vive no
     * cliente não é um tecto**: basta uma app desactualizada, dois aparelhos da
     * mesma pessoa, ou um toque duplo que o React não agrupe.
     *
     * É um `Map` do processo, e isso é dito de propósito: serve o caso real
     * (pedidos do mesmo paciente a chegar ao mesmo contentor em segundos) e
     * **não** serve vários contentores. Para esse seria preciso uma coluna
     * `syncInFlightAt` na ligação. Um `Map` honesto é melhor do que uma coluna
     * que eu ainda não precisei de provar.
     */
    if (emCurso.has(connection.id)) {
      return NextResponse.json(
        { error: 'Sync already running', code: 'already_running' },
        { status: 409 }
      );
    }
    emCurso.add(connection.id);
    try {
      const counts = await ingestWithings(userId, connection);
      /*
       * **A falha anterior é apagada quando esta corre.** Sem isto, uma falha de
       * há três semanas ficava a dizer "a última sincronização falhou" por cima
       * de dados que chegaram esta manhã.
       */
      if (connection.lastSyncError) {
        await (prisma as any).wearableConnection
          .update({
            where: { id: connection.id },
            data: { lastSyncError: null, lastSyncErrorAt: null },
          })
          .catch(() => {});
      }
      return NextResponse.json({ ok: true, ...counts });
    } catch (e: any) {
      console.error('[wearables/sync] withings:', e?.message);
      await (prisma as any).wearableConnection.update({
        where: { id: connection.id },
        data: {
          status: 'ERROR',
          /**
           * **A mensagem, e não só o estado** (119 T-8, achado do QA).
           *
           * A rota escrevia `status: 'ERROR'` e mais nada. A tela do paciente
           * tem desde sempre a frase *"A última sincronização falhou: …"*, e
           * ela era **inalcançável**: a pendência que a produz lê
           * `lastSyncError`, que ninguém escrevia e que a rota das ligações nem
           * devolvia.
           *
           * O resultado medido: a paciente puxava a tela, a roda girava, os
           * números continuavam os de três horas antes, e **nada** dizia
           * porquê. Isso é a ausência silenciosa outra vez — e desta vez a
           * justificação para não mostrar um alerta era precisamente esta
           * frase que não existia.
           */
          lastSyncError: String(e?.message ?? e).slice(0, 500),
          lastSyncErrorAt: new Date(),
        },
      });
      return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 502 });
    } finally {
      /*
       * Sempre, incluindo quando o `catch` acima também falhou a escrever: uma
       * entrada que nunca sai tranca aquela ligação até o contentor reiniciar.
       */
      emCurso.delete(connection.id);
    }
  }

  if (!connection.owUserId) {
    return NextResponse.json({ error: 'Not connected' }, { status: 404 });
  }

  await owSyncUser(provider.toLowerCase(), connection.owUserId);

  return NextResponse.json({ ok: true, message: 'Sync initiated' });
}
