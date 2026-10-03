export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { deliveryState } from "@/lib/withings-subscriptions";
import { daysSilent, isSilent, silenceThreshold } from "@/lib/wearable-silence";

/**
 * O estado das ligações deste paciente, **na ficha dele** (114 T-6).
 *
 * O Bruno, 30/09/2026: *"a gente tem que ter como monitorar na área da clínica
 * de cada paciente para ter certeza que as conexões estão ativas e
 * sincronizadas. Não podemos perder essa conexão do paciente, que isso é muito
 * sério."*
 *
 * O monitor existia — `/admin/biohacking` lista todos os pacientes com o estado
 * de entrega e quantos dias em silêncio. O que não existia era ele **onde o
 * terapeuta olha**: a ficha do paciente não dizia uma palavra sobre o aparelho,
 * e a aba de pressão — que vive do que o aparelho manda — também não.
 *
 * Três coisas, e elas respondem perguntas diferentes:
 *
 * | campo | responde |
 * |---|---|
 * | `delivery` | a Withings **prometeu** avisar? (`receiving`, `partial`, `silent`, `unchecked`) |
 * | `lastReadingAt` | quando chegou dado de facto |
 * | `lastSyncedAt` | quando falámos com eles — o que acontece com ou sem dado |
 *
 * É a confusão entre a segunda e a terceira que fazia a tela parecer saudável:
 * *"last sync: hoje"* diz que conversámos, não que veio alguma coisa.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await staffPatientAccess(req, params.id);
  if (guard.response) return guard.response;

  const conexoes = await (prisma as any).wearableConnection.findMany({
    where: { userId: params.id },
    select: {
      id: true,
      provider: true,
      status: true,
      deviceLabel: true,
      isClinicDevice: true,
      lastSyncedAt: true,
      lastReadingAt: true,
      createdAt: true,
      notifyCheckedAt: true,
      notifyConfirmedAppli: true,
      /*
       * **Os dois estados que faltavam** (121 T-4).
       *
       * `needsReauthAt`: a cadeia de tokens foi invalidada e **só a pessoa**
       * resolve. Enquanto isto não existia, a ligação do Bruno ficou
       * `CONNECTED` e morta 27 dias, e esta mesma tela lia `CONNECTED`.
       *
       * `lastPartialRead`: a última passagem leu umas coisas e não outras — o
       * ECG falhou e o sono entrou. Não é falha de sincronização, e por isso
       * não vive no `lastSyncError`; mas é a clínica que precisa de o ver.
       */
      needsReauthAt: true,
      lastPartialRead: true,
      lastPartialReadAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const limite = await silenceThreshold(guard.actor.clinicId);

  return NextResponse.json({
    connections: conexoes.map((c: any) => {
      const dias = daysSilent(c);
      return {
        id: c.id,
        provider: c.provider,
        status: c.status,
        deviceLabel: c.deviceLabel,
        isClinicDevice: c.isClinicDevice === true,
        lastSyncedAt: c.lastSyncedAt,
        lastReadingAt: c.lastReadingAt,
        delivery: deliveryState(c, { soPressao: c.isClinicDevice === true }),
        daysSilent: dias,
        // `isSilent`, e não a conta à mão: ela isenta o `DISCONNECTED` — quem
        // desconectou sabe que não vai receber — e não isenta o `ERROR`, que é
        // exatamente o estado que precisa de aparecer. Repetir a conta aqui era
        // como as duas telas começariam a discordar.
        silent: isSilent(c, limite),
        /*
         * **Precisa da pessoa**, e desde quando. É o estado que o `silent` e o
         * `delivery` não distinguem: uma ligação pode estar calada por o
         * paciente não usar o relógio, ou porque a autorização morreu — e só a
         * segunda tem uma acção do outro lado.
         */
        needsReauthAt: c.needsReauthAt ?? null,
        /* O que a última passagem não conseguiu ler, por nome. */
        partialRead: c.lastPartialRead ? String(c.lastPartialRead).split(",") : [],
        partialReadAt: c.lastPartialReadAt ?? null,
        // O limiar é da clínica (`WEARABLE_SILENCE`) e vai junto, para a tela
        // não inventar um número próprio.
        silenceThreshold: limite,
      };
    }),
  });
}
