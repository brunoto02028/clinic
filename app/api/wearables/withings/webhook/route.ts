export const dynamic = "force-dynamic";

import { registarFalhaDaLigacao } from "@/lib/withings-estado-da-ligacao";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logSystem } from "@/lib/system-logger";
import { ingestWithings } from "@/lib/withings-ingest";
import { WITHINGS_APPLI } from "@/lib/withings";

/**
 * Withings notifications: a measurement arrives when it is taken.
 *
 * Until now the data only appeared on the next scheduled sync, which is fine
 * for sleep and useless for the thing this activity is built around — a
 * therapist standing next to a patient, waiting for the reading to land in the
 * right record (T-14's three-minute window has no meaning at cron speed).
 *
 * Shape of their call: `application/x-www-form-urlencoded`, with `userid`,
 * `startdate`, `enddate` and `appli`. They expect `{"status":0}` back.
 *
 * Two deliberate choices about failure:
 *
 * - **Always answer 0.** Withings disables a subscription that keeps erroring,
 *   and a disabled subscription is silent — the worst failure this endpoint
 *   has, because nothing looks broken. Whatever happens here is logged and
 *   swallowed; the scheduled sync remains the safety net.
 * - **No shared secret to verify.** Withings does not sign the body. The
 *   protection is that the `userid` must already be a connection of ours, and
 *   that nothing is trusted from the request itself: the values are fetched
 *   from Withings with our own token. A forged call can, at worst, make us
 *   re-read our own data.
 */

/** Which kinds of data each `appli` maps to, for a narrow fetch. */
const KINDS_BY_APPLI: Record<number, Array<"bp" | "activity" | "sleep" | "vitals" | "ecg">> = {
  [WITHINGS_APPLI.BLOOD_PRESSURE]: ["bp"],
  [WITHINGS_APPLI.WEIGHT]: ["bp"], // the BPM reports through the same measure feed
  [WITHINGS_APPLI.TEMPERATURA]: ["vitals"],
  [WITHINGS_APPLI.ACTIVITY]: ["activity"],
  [WITHINGS_APPLI.SLEEP]: ["sleep"],
  /*
   * **O ECG passa a chegar em segundos** (121 T-9). Até aqui não havia
   * subscrição nenhuma para ele: uma gravação esperava pela rede de quinze
   * minutos, enquanto a pressão e os passos chegavam no instante.
   */
  [WITHINGS_APPLI.ECG_FEITO]: ["ecg"],
  [WITHINGS_APPLI.VFC]: ["vitals"],
};

/**
 * **Uma gravação de ECG que falhou** (`appli` 55).
 *
 * Não há nada para ir buscar — é só a notificação, e é a **única** forma de
 * saber que o paciente tentou e não conseguiu: nenhuma consulta de dados revela
 * uma tentativa falhada.
 *
 * Fica registada e mais nada. Mandar seja o que for ao paciente por causa disto
 * seria um envio automático, que esta base não faz.
 */
const SO_NOTIFICACAO = new Set<number>([WITHINGS_APPLI.ECG_FALHOU]);

export async function POST(req: NextRequest) {
  const ok = () => NextResponse.json({ status: 0 });

  /* Fora do `try` para o `catch` o alcançar — ver o registo da falha, abaixo. */
  let connection: any = null;
  try {
    const raw = await req.text();
    const form = new URLSearchParams(raw);
    const userid = form.get("userid");
    const appli = Number(form.get("appli") ?? 0);
    const startdate = Number(form.get("startdate") ?? 0);
    const enddate = Number(form.get("enddate") ?? 0);

    if (!userid) return ok();

    /**
     * A da clínica primeiro — e a ordem é o conserto (092 T-1).
     *
     * Uma conta Withings pode estar ligada a nós **duas vezes**: como aparelho
     * da clínica e como aparelho pessoal de quem o comprou. É o caso do Bruno,
     * e é o que ele quer — um medidor servindo aos dois papéis.
     *
     * Isto era `findFirst` **sem ordenação**. Com duas linhas casando, o banco
     * devolve uma arbitrária, e qual delas vence é sorte — podendo mudar de uma
     * medição para a outra. Sorteio num dado clínico.
     *
     * A da clínica vence de propósito, porque é a única que sabe decidir: se
     * houver janela aberta a leitura é do paciente daquela janela; se não
     * houver, vai para a caixa de entrada, para alguém dizer de quem era. O
     * caminho pessoal não enxerga janela nenhuma, e atribuiria ao dono uma
     * medição feita num paciente.
     *
     * Escrevi aqui, antes, que sem janela a leitura "cai para o dono pessoal do
     * mesmo aparelho". Era o atalho que o review de 27/09/2026 derrubou: o
     * terapeuta que esquece de abrir a janela produz exatamente este estado.
     */
    /**
     * **Todas as ligações desta conta, e não uma** (121 T-7).
     *
     * Era `findFirst` com a da clínica à frente — e a ordem resolvia o sorteio,
     * mas criou um silêncio pior: a seguir, *"se esta não estiver `CONNECTED`,
     * descarta"*. Com a mesma conta ligada duas vezes, **uma ligação doente
     * calava a irmã sã**. Em produção, hoje: o manguito da clínica com o token
     * morto, e cada empurrão da Withings para a conta pessoal do Bruno —
     * `appli=16` (passos), `appli=44` (sono) — descartado, com a ligação
     * pessoal a funcionar perfeitamente ao lado. O tempo real desapareceu e só
     * a rede de 15 minutos o segurava.
     *
     * Processar as duas é **seguro desde a 122 T-1/T-2**: a régua garante que a
     * pessoal se cala exactamente quando a da clínica atribui. Antes desta
     * régua, duas ligações a processar o mesmo empurrão era o defeito que a 092
     * corrigiu; agora é o conserto.
     */
    const ligacoes = await (prisma as any).wearableConnection.findMany({
      where: { provider: "WITHINGS", providerUserId: String(userid) },
      orderBy: { isClinicDevice: "desc" },
      select: {
        id: true, userId: true, accessToken: true, refreshToken: true,
        tokenExpiresAt: true, status: true, isClinicDevice: true, clinicId: true,
        providerUserId: true,
      },
    });
    const servem = (ligacoes ?? []).filter((c: any) => c.status === "CONNECTED");

    // A notification for an account we do not know is not an error on their
    // side or ours — it is a subscription left over from a disconnected
    // patient. Answering 0 keeps their retry queue from filling up.
    //
    // The test is "is it connected", not "is it not disconnected": a
    // connection in any other state — including one whose revocation failed —
    // must not have data written to it.
    //
    /**
     * E o descarte **fica registrado** (092 T-3).
     *
     * Este `return` era seco. A Withings recebia `{"status":0}` e ficava
     * satisfeita, a leitura ia para o lixo, e **não existia lugar nenhum** onde
     * alguém descobrisse isso — nem log, nem tela. Foi assim que o medidor da
     * clínica passou semanas sem entregar pressão ao paciente com todas as
     * telas dizendo "conectado".
     *
     * Descarte silencioso é a falha que mais custa aqui, porque a única pessoa
     * que notaria é a que não tem como olhar. Achado do QA da 092, cenário
     * 3.1b.
     */
    if (servem.length === 0) {
      /*
       * O estado de **todas** elas, e não o da primeira: era isso que faltava
       * para se ver, no log, que havia uma ligação sã a ser calada por outra.
       */
      const estados = (ligacoes ?? []).map((c: any) => c.status).join(",");
      const motivo = (ligacoes ?? []).length === 0 ? "conta desconhecida" : `nenhuma ligacao servivel (${estados})`;
      console.warn(`[withings/webhook] descartada: ${motivo} userid=${userid} appli=${appli}`);
      await logSystem({
        level: "WARN",
        category: "API",
        message: `Withings descartou notificação: ${motivo}`,
        source: "api/wearables/withings/webhook",
        path: "/api/wearables/withings/webhook",
        method: "POST",
        userId: (ligacoes ?? [])[0]?.userId,
        details: {
          providerUserId: String(userid),
          appli,
          ligacoes: (ligacoes ?? []).length,
          connectionId: (ligacoes ?? [])[0]?.id ?? null,
          connectionStatus: (ligacoes ?? [])[0]?.status ?? null,
          estados,
          isClinicDevice: (ligacoes ?? [])[0]?.isClinicDevice ?? null,
          // Uma assinatura órfã de paciente desconectado é esperada e não é
          // defeito; a da clínica sumindo é o defeito. Quem lê o log precisa
          // distinguir as duas sem abrir o banco.
          esperado: (ligacoes ?? []).length === 0,
        },
      }).catch((e) => console.error("[withings/webhook] log falhou:", e?.message));
      return ok();
    }

    // Their window, widened by a minute at each end: the timestamps are whole
    // seconds and their clock is not ours, and a measurement missed here would
    // wait for the next scheduled sync.
    const since = startdate ? new Date((startdate - 60) * 1000) : new Date(Date.now() - 24 * 3600_000);
    const until = enddate ? new Date((enddate + 60) * 1000) : new Date();

    if (SO_NOTIFICACAO.has(appli)) {
      /*
       * Não há dado para ir buscar. Vale a linha, porque *"tentou e falhou"* é
       * uma coisa que nenhuma consulta nossa descobre.
       */
      console.log(
        `[withings/webhook] ECG falhado userid=${userid} ligacoes=${servem.length}/${(ligacoes ?? []).length}`
      );
      await logSystem({
        level: "INFO",
        category: "API",
        message: "Withings: gravação de ECG falhada no aparelho",
        source: "api/wearables/withings/webhook",
        path: "/api/wearables/withings/webhook",
        method: "POST",
        userId: servem[0]?.userId,
        details: { providerUserId: String(userid), appli, startdate, enddate },
      }).catch((e) => console.error("[withings/webhook] log falhou:", e?.message));
      return ok();
    }

    /*
     * **Uma falha de uma não pode parar a outra** (121 T-7). O `try` de fora
     * apanhava a primeira e saía do laço — que é a mesma forma do defeito que
     * esta tarefa conserta, um nível abaixo.
     */
    const resumo: string[] = [];
    for (const c of servem) {
      connection = c;
      const quem = c.isClinicDevice ? "clinica" : "pessoal";
      try {
        const counts = await ingestWithings(c.userId, c, {
          since,
          until,
          kinds: KINDS_BY_APPLI[appli] ?? ["bp"],
          /* Quem pediu, para o log da renovação o dizer — ver 121 T-5. */
          origem: "webhook",
        });
        // O carimbo de chegada é do `ingestWithings`, com a data da leitura — os
        // três chamadores usam o mesmo caminho, e dois deles carimbando por conta
        // própria era como o terceiro ficava de fora.
        resumo.push(
          `${quem} bp=${counts.bloodPressure} activity=${counts.activityDays} sleep=${counts.sleepNights}`
        );
      } catch (e: any) {
        console.error(`[withings/webhook] ligacao ${c.id} (${quem}) falhou:`, e?.message);
        await registarFalhaDaLigacao(c.id, e);
        resumo.push(`${quem} FALHOU`);
      }
    }

    console.log(
      `[withings/webhook] userid=${userid} appli=${appli} ligacoes=${servem.length}/${(ligacoes ?? []).length} | ${resumo.join(" | ")}`
    );
    return ok();
  } catch (e: any) {
    /**
     * **O webhook deixa de engolir a falha** (121 T-2).
     *
     * Era `console.error` e mais nada: nem `lastSyncError`, nem estado, nem
     * contador. A ligação do Bruno morreu assim — o log do contentor repetia
     * `Invalid Params: invalid refresh_token` e a tela dele não mostrava
     * pendência nenhuma, porque não havia nada guardado para ela mostrar.
     *
     * Continua a responder `ok()`: a Withings corta a assinatura de quem não
     * responde `status: 0`, e perder a assinatura seria parar de sincronizar
     * por causa de um erro a registar que parámos de sincronizar.
     */
    console.error("[withings/webhook] error:", e?.message);
    if (connection?.id) await registarFalhaDaLigacao(connection.id, e);
    return ok();
  }
}

/**
 * Withings checks the URL with a HEAD/GET before accepting a subscription.
 * An endpoint that only answers POST fails that check, and the subscription is
 * never created — with no error anywhere except a measurement that never
 * arrives.
 */
export async function GET() {
  return NextResponse.json({ status: 0 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
