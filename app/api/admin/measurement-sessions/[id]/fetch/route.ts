export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { expireStaleSessions } from "@/lib/clinic-device";
import { ingestWithings } from "@/lib/withings-ingest";

/**
 * "Já medi — busca agora." (27/09/2026)
 *
 * O Bruno: *"quando acabar de medir, eu quero que tenha um botão nosso ali...
 * 'já foi medido', assim para ele realmente buscar a informação e trazer de
 * fato a informação para dentro."*
 *
 * ## Por que isto faltava, e por que é a correção certa
 *
 * A tela de espera **só escutava**: abria a janela e ficava consultando a cada
 * três segundos até a leitura aparecer, e a leitura só aparecia quando a
 * Withings resolvia nos chamar. Se a notificação deles não vem — assinatura
 * vencida, aparelho que só sobe horas depois, rede do consultório — a tela
 * espera para sempre, e ninguém descobre que não veio.
 *
 * **Esperar um empurrão que pode não vir é a definição de falha silenciosa.**
 * Este caminho inverte: quem sabe que a medição aconteceu é a pessoa que
 * acabou de medir, e é ela que manda buscar.
 *
 * Não substitui o webhook — quando ele chega, chega antes e é melhor. Substitui
 * o *depender* dele.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await (prisma as any).clinicMeasurementSession.findUnique({
    where: { id: params.id },
    /*
     * `patientId` **tem de estar aqui**: é a chave da contagem lá em baixo, e
     * um campo que falta no `select` chega lá como `undefined`. O Prisma
     * **ignora** um `where` com `undefined` em vez de não casar nada — logo a
     * contagem perdia o filtro e varria a tabela inteira, incluindo gravações
     * de pacientes de **outras clínicas**. Achado do QA de 03/10.
     */
    select: {
      id: true,
      clinicId: true,
      patientId: true,
      status: true,
      openedAt: true,
      expiresAt: true,
      connectionId: true,
    },
  });

  // Sessão de outra clínica responde igual a inexistente — a mesma regra do
  // GET ao lado.
  if (!session || !actor.clinicId || session.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Janela fechada não busca nada. Sem isto, tocar no botão numa sessão
  // cancelada ou vencida ia à Withings, trazia a leitura e a jogava na caixa
  // de entrada — e a tela respondia "encontrei", apontando para uma sessão que
  // não existe mais. A resposta certa é dizer que a janela fechou, e que é
  // preciso abrir outra (achado do review de 27/09/2026).
  await expireStaleSessions(session.connectionId);
  const aindaAberta = session.status === "OPEN" && session.expiresAt.getTime() > Date.now();
  if (!aindaAberta) {
    return NextResponse.json(
      {
        error: "This measurement window is closed. Open a new one and measure again.",
        errorPt: "Esta janela de medição está fechada. Abra outra e meça de novo.",
        code: "session_closed",
        status: session.status,
      },
      { status: 409 }
    );
  }

  const connection = await (prisma as any).wearableConnection.findUnique({
    where: { id: session.connectionId },
    select: {
      id: true, userId: true, accessToken: true, refreshToken: true,
      tokenExpiresAt: true, status: true, isClinicDevice: true, clinicId: true,
      // A regra do aparelho compartilhado (092 T-1) decide pelo `providerUserId`
      // se esta conta também é a da clínica. Sem ele aqui, este caminho
      // discordaria do webhook e da varredura diária.
      providerUserId: true,
    },
  });
  if (!connection || connection.status !== "CONNECTED") {
    return NextResponse.json(
      {
        error: "The device is not connected. Reconnect it in Settings.",
        errorPt: "O aparelho não está conectado. Reconecte em Configurações.",
        code: "device_disconnected",
      },
      { status: 409 }
    );
  }

  /**
   * A janela que se pede à Withings é a da sessão, folgada nas duas pontas.
   *
   * Do lado de trás porque o relógio do manguito não é o nosso; do lado da
   * frente porque a pessoa toca no botão **depois** de medir, e a medida pode
   * ter caído um instante antes de a sessão abrir.
   */
  const FOLGA_MS = 5 * 60 * 1000;
  const since = new Date(session.openedAt.getTime() - FOLGA_MS);
  const until = new Date(Math.min(Date.now() + FOLGA_MS, session.expiresAt.getTime() + FOLGA_MS));

  /**
   * A ida à Withings é a única parte daqui que depende de terceiro, e é a que
   * mais falha: token que não renova, API fora, rede do consultório.
   *
   * Sem este `catch` o terapeuta recebia 500 e a tela dizia "erro" — a mesma
   * palavra para "a Withings está fora do ar" e "há um defeito nosso". Ele
   * apertaria de novo para sempre sem saber qual dos dois. Achado do review de
   * 27/09/2026.
   */
  let counts;
  try {
    counts = await ingestWithings(connection.userId, connection, {
      since,
      until,
      /*
       * **E o ECG** (122 T-2). O BeamO mede os dois nos mesmos três minutos, e
       * `since`/`until` já limitam a leitura a esta janela — logo a gravação que
       * vier é da pessoa que esta janela nomeia, atribuída pela mesma regra que
       * atribui a pressão.
       */
      kinds: ["bp", "ecg"],
    });
  } catch (e: any) {
    console.error("[measurement-fetch] withings failed:", e?.message);
    return NextResponse.json(
      {
        error: "Could not reach the device's account just now. Try again in a moment.",
        errorPt: "Não foi possível falar com a conta do aparelho agora. Tente de novo em instantes.",
        code: "provider_unavailable",
      },
      { status: 502 }
    );
  }

  /*
   * O ECG **deste paciente** dentro desta janela, depois da atribuição.
   *
   * Uma falha aqui não pode derrubar a resposta — a pressão já foi atribuída e
   * é o que o terapeuta está à espera de ver. `null` quer dizer *"não sei"*, e
   * a tela não afirma nada sobre o ECG nesse caso.
   */
  const ecgDoPaciente: number | null = !session.patientId
    ? /*
       * Sem paciente não há o que contar — e um `undefined` aqui não seria
       * "zero", seria **sem filtro**. A guarda é explícita porque a diferença
       * entre as duas é a tabela toda.
       */
      null
    : await (prisma as any).ecgRecording
        .count({
          where: {
            userId: session.patientId,
            provider: "WITHINGS",
            recordedAt: { gte: since, lte: until },
          },
        })
        .catch((e: any) => {
          console.error("[measurement-fetch] contar ECG falhou:", e?.message ?? e);
          return null;
        });

  // Relê a sessão: `ingestWithings` roda a atribuição, e se a leitura casou
  // esta janela ela já está ligada aqui.
  const depois = await (prisma as any).clinicMeasurementSession.findUnique({
    where: { id: params.id },
    select: {
      status: true,
      reading: { select: { id: true, systolic: true, diastolic: true, heartRate: true, measuredAt: true } },
    },
  });

  return NextResponse.json({
    found: !!depois?.reading,
    reading: depois?.reading ?? null,
    status: depois?.status ?? session.status,
    // Quantas leituras **vieram** da Withings nesta janela, salvas ou não.
    // Estava contando as salvas — e aí, no caso exato em que a distinção
    // importa (veio uma e foi para a caixa), o número era zero e a tela dizia
    // "nada veio do aparelho". O terapeuta apertaria para sempre com a leitura
    // já esperando na caixa. Achado do review de 27/09/2026.
    lidas: counts.bloodPressureRead,
    /*
     * **Quantas gravações de ECG este paciente tem nesta janela.**
     *
     * Sem este número a tela dizia *"nada veio do aparelho"* a um terapeuta que
     * tinha acabado de gravar um ECG e de o ver guardado no prontuário — a
     * mesma ausência silenciosa que o `lidas` conserta para a pressão.
     *
     * E é contado **no prontuário deste paciente**, não no `counts` da
     * passagem: o `since`/`until` é a janela ±5 min, e uma gravação atribuída a
     * **outro** paciente por uma janela vizinha também subiria o contador da
     * passagem. O terapeuta lia "um ECG foi salvo neste histórico" sobre a
     * ficha errada — e é por essa frase que ele decide não repetir a medição.
     * Contar linhas também torna o segundo toque no botão honesto: o `upsert`
     * não cria nada, mas o contador da passagem subia na mesma.
     */
    ecg: ecgDoPaciente,
  });
}
