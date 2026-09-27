export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
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

  const connection = await (prisma as any).wearableConnection.findUnique({
    where: { id: session.connectionId },
    select: {
      id: true, userId: true, accessToken: true, refreshToken: true,
      tokenExpiresAt: true, status: true, isClinicDevice: true, clinicId: true,
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

  const counts = await ingestWithings(connection.userId, connection, {
    since,
    until,
    kinds: ["bp"],
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
    // Quantas leituras vieram da Withings nesta janela, mesmo que nenhuma
    // tenha casado. Zero e "veio uma mas foi para a caixa de entrada" são
    // situações diferentes, e a tela precisa poder dizer qual é.
    lidas: counts.bloodPressure,
  });
}
