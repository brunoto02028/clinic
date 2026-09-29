export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestSession } from "@/lib/dual-auth";
import { pushChamadaComecou } from "@/lib/push-notify";
import { VideoCallError, exigirJanelaAberta, videoCallsEnabled } from "@/lib/video-call";

/**
 * O terapeuta **chama** o paciente para a consulta por vídeo (089).
 *
 * ## Por que isto existe
 *
 * Sem esta rota, a videochamada não acontecia. O terapeuta conseguia entrar na
 * sala e esperar, e **nada avisava o paciente** — se ele não estivesse com o app
 * aberto naquele minuto, a consulta não ocorria. "Chamar alguém" é metade do que
 * uma videochamada é, e essa metade faltava.
 *
 * ## Por que é um botão, e não automático ao entrar
 *
 * Porque a regra da casa é que **nada sai para paciente sozinho**: os crons de
 * lembrete estão desligados desde 17/09/2026 por isso. Avisar quando o terapeuta
 * entra parece inofensivo até ele abrir a sala cedo para testar o microfone — e
 * aí o telefone do paciente toca sem que ninguém tenha decidido.
 *
 * Um botão é uma pessoa decidindo. `lib/push-notify.ts` existe justamente para
 * isto, e o seu próprio comentário diz: *"cada função é chamada de um lugar,
 * onde uma pessoa da clínica já apertou um botão"*.
 *
 * ## E quem recebe quando o paciente é uma criança
 *
 * Quem responde por ela. Uma pessoa gerida nasce sem aparelho — não faz login e
 * nada chega ao telefone dela. `lib/push-send.ts` traduz isso num lugar só, e o
 * aviso chega ao responsável **com o nome da criança no corpo**, senão a mãe
 * leria "seu terapeuta está esperando" sem saber por quem.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!videoCallsEnabled()) {
    return NextResponse.json(
      {
        error: "Video consultations are not available yet.",
        errorPt: "A consulta por vídeo ainda não está disponível.",
        code: "video_unavailable",
      },
      { status: 503 }
    );
  }

  const session = await getRequestSession(req);
  if (!session?.user) {
    return NextResponse.json(
      {
        error: "Sign in again to do that.",
        errorPt: "Entre de novo para fazer isso.",
        code: "unauthorized",
      },
      { status: 401 }
    );
  }
  const quemPede = (session.user as any).id as string;

  const consulta = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      mode: true,
      status: true,
      dateTime: true,
      duration: true,
      patientId: true,
      therapistId: true,
      // De quantos minutos antes esta clínica abre a sala (29/09/2026).
      clinic: { select: { videoEarlyMinutes: true } },
    },
  });

  /**
   * **Só quem atende chama.**
   *
   * O paciente não chama o terapeuta: seria o app do paciente fazendo o telefone
   * de alguém da clínica tocar, e essa porta não existe em lugar nenhum do
   * sistema. Quem não é o terapeuta desta consulta recebe "não existe", pela
   * mesma razão de sempre — dizer "existe, mas não é sua" conta a um estranho
   * que aquela consulta existe.
   */
  if (!consulta || consulta.therapistId !== quemPede) {
    return NextResponse.json(
      {
        error: "This consultation is not available.",
        errorPt: "Esta consulta não está disponível.",
        code: "not_found",
      },
      { status: 404 }
    );
  }

  if (consulta.mode !== "VIDEO") {
    return NextResponse.json(
      { error: "This consultation is in person.", errorPt: "Esta consulta é presencial.", code: "not_video" },
      { status: 409 }
    );
  }

  /**
   * Cancelada, faltou — e **concluída** (achado 3 do QA da T-8).
   *
   * `COMPLETED` passava: a rota respondia 200 e o telefone de alguém tocava
   * para uma consulta que já tinha acontecido. A agenda esconde o botão nesse
   * caso, e esconder botão não é fechar porta: quem chama é o servidor.
   */
  if (
    consulta.status === "CANCELLED" ||
    consulta.status === "NO_SHOW" ||
    consulta.status === "COMPLETED"
  ) {
    return NextResponse.json(
      {
        error: "This consultation is not open for a call.",
        errorPt:
          consulta.status === "COMPLETED"
            ? "Esta consulta já foi concluída."
            : "Esta consulta não está mais marcada.",
        code: "not_scheduled",
      },
      { status: 409 }
    );
  }

  /**
   * A mesma janela que a entrada usa.
   *
   * Chamar alguém para uma sala que ainda não abriu — ou que já fechou — faria o
   * telefone tocar para um botão que vai recusar. O aviso e a porta têm de
   * concordar sobre quando a consulta existe.
   */
  try {
    exigirJanelaAberta(
      consulta.dateTime,
      consulta.duration,
      new Date(),
      (consulta as any).clinic?.videoEarlyMinutes
    );
  } catch (e) {
    if (e instanceof VideoCallError) {
      const pt: Record<string, string> = {
        too_early: "A consulta ainda não abriu. Você chama a partir de dez minutos antes.",
        too_late: "Esta consulta já terminou.",
      };
      return NextResponse.json(
        { error: e.message, errorPt: pt[e.code] ?? e.message, code: e.code },
        { status: e.status }
      );
    }
    throw e;
  }

  const r = await pushChamadaComecou(consulta.patientId, consulta.id);

  /**
   * "Quantos aparelhos tocaram" é a resposta, e não "enviado".
   *
   * Zero é uma notícia, não um erro: quer dizer que o paciente não instalou o
   * app, ou desligou os avisos. O terapeuta precisa saber disso **antes** de
   * ficar dez minutos esperando alguém que não foi chamado.
   */
  return NextResponse.json({
    chamado: true,
    aparelhos: r?.sent ?? 0,
    falhas: r?.failed ?? 0,
  });
}
