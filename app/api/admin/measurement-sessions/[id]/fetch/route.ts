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
    select: { id: true, clinicId: true, status: true, openedAt: true, expiresAt: true, connectionId: true },
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
      kinds: ["bp"],
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
  });
}
