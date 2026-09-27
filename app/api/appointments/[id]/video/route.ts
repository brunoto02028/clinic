export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestSession } from "@/lib/dual-auth";
import { porContaDeNoBearer } from "@/lib/sessao-emprestada";
import {
  VideoCallError,
  criarSalaDaConsulta,
  exigirJanelaAberta,
  tokenParaEntrar,
  videoCallsEnabled,
} from "@/lib/video-call";

/**
 * Entrar na consulta por vídeo (089 T-3).
 *
 * Serve as duas pontas com a mesma regra: o terapeuta pelo painel (sessão web) e
 * o paciente pelo app (bearer). `getRequestSession` aceita os dois, e tudo o que
 * decide quem entra está aqui e em `lib/video-call.ts` — nada na tela.
 *
 * ## Por que a sala nasce aqui, e não no navegador
 *
 * `/admin/video-consultations` gerava o id da sala **no cliente**, com
 * `generateRoomId()`, e apontava para `/video-room/<id>`. Nenhuma sala era criada
 * em lugar nenhum, então não havia nada para entrar — o botão abria 404.
 *
 * Criar do lado do servidor, na primeira vez que alguém pede para entrar, tem
 * duas vantagens além de funcionar: a sala só existe se alguém de fato vai usá-la,
 * e o nome dela é derivado da consulta, então um retry não cria uma segunda.
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quemPede = (session.user as any).id as string;

  const consulta = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      mode: true,
      dateTime: true,
      duration: true,
      status: true,
      patientId: true,
      therapistId: true,
      clinicId: true,
      videoRoomUrl: true,
      patient: { select: { firstName: true, lastName: true } },
      therapist: { select: { firstName: true, lastName: true } },
    },
  });

  /**
   * Quem não é da consulta recebe "não existe".
   *
   * São exatamente duas pessoas: quem é atendido e quem atende. Um admin da
   * clínica **não** entra por aqui — presença numa consulta não é permissão
   * administrativa, é uma pessoa na sala, e quem está sendo atendido tem direito
   * de saber quem entrou.
   *
   * E responder 404 em vez de 403: dizer "existe, mas você não participa" conta
   * a um estranho que aquela consulta existe.
   */
  const ehPaciente = consulta?.patientId === quemPede;
  const ehTerapeuta = consulta?.therapistId === quemPede;
  if (!consulta || (!ehPaciente && !ehTerapeuta)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (consulta.mode !== "VIDEO") {
    return NextResponse.json(
      {
        error: "This consultation is in person.",
        errorPt: "Esta consulta é presencial.",
        code: "not_video",
      },
      { status: 409 }
    );
  }

  // Consulta cancelada não tem sala para entrar. A janela de horário continuaria
  // válida, então sem isto daria para entrar numa consulta desmarcada.
  if (consulta.status === "CANCELLED" || consulta.status === "NO_SHOW") {
    return NextResponse.json(
      {
        error: "This consultation is no longer scheduled.",
        errorPt: "Esta consulta não está mais marcada.",
        code: "not_scheduled",
      },
      { status: 409 }
    );
  }

  const pessoa = ehTerapeuta ? consulta.therapist : consulta.patient;
  const nomeDaPessoa = [pessoa?.firstName, pessoa?.lastName].filter(Boolean).join(" ") || "Participant";

  /**
   * Quem está de fato na sala, e não só de quem é a consulta.
   *
   * Numa sessão emprestada (091 T-7) o `sub` do token é a **criança** e o
   * `onBehalfOf` é quem responde por ela. Sem isto, o terapeuta veria "Ana" no
   * bloco de vídeo e conversaria com a mãe sem saber — numa consulta clínica,
   * não saber com quem se está falando é pior que não ter a chamada.
   *
   * O nome da consulta continua primeiro porque é dela que se trata; o de quem
   * está presente vem junto, entre parênteses.
   */
  const porContaDe = porContaDeNoBearer(req.headers.get("authorization"));
  let nome = nomeDaPessoa;
  if (porContaDe && ehPaciente) {
    const responsavel = await prisma.user.findUnique({
      where: { id: porContaDe },
      select: { firstName: true, lastName: true },
    });
    const nomeDoResponsavel = [responsavel?.firstName, responsavel?.lastName].filter(Boolean).join(" ");
    if (nomeDoResponsavel) nome = `${nomeDaPessoa} (com ${nomeDoResponsavel})`;
  }

  try {
    /**
     * A janela **antes** da sala (review de 27/09/2026).
     *
     * Estava depois: abrir uma consulta da semana passada tentava criar uma sala
     * com `exp` no passado, a Daily recusava, e a pessoa lia "o servico de video
     * recusou o pedido" em vez de "esta consulta ja terminou". E todo toque no
     * endpoint criava sala, contrariando o "so existe se alguem vai usar".
     */
    exigirJanelaAberta(consulta.dateTime, consulta.duration);

    const sala = await criarSalaDaConsulta({
      appointmentId: consulta.id,
      dateTime: consulta.dateTime,
      duracaoMin: consulta.duration,
    });

    const token = await tokenParaEntrar({
      appointmentId: consulta.id,
      dateTime: consulta.dateTime,
      duracaoMin: consulta.duration,
      nome,
      ehTerapeuta,
    });

    /**
     * A URL da sala fica gravada, o token **não**.
     *
     * O token é de uma pessoa e de uma janela; guardá-lo faria dele uma chave
     * reutilizável por quem lesse a linha. A URL sozinha não abre nada, porque a
     * sala é privada.
     */
    if (consulta.videoRoomUrl !== sala.url) {
      await prisma.appointment.update({
        where: { id: consulta.id },
        data: { videoRoomId: sala.name, videoRoomUrl: sala.url },
      });
    }

    return NextResponse.json({
      url: sala.url,
      token,
      // O que a tela precisa para montar o convite sem pedir de novo.
      nome,
      ehTerapeuta,
      comeca: consulta.dateTime,
      duracaoMin: consulta.duration,
    });
  } catch (e) {
    if (e instanceof VideoCallError) {
      const pt: Record<string, string> = {
        too_early: "Esta consulta ainda não abriu. Você entra a partir de dez minutos antes.",
        too_late: "Esta consulta já terminou.",
        video_unavailable: "A consulta por vídeo ainda não está disponível.",
        provider_error: "O serviço de vídeo recusou o pedido. Tente de novo.",
      };
      return NextResponse.json(
        { error: e.message, errorPt: pt[e.code] ?? e.message, code: e.code },
        { status: e.status }
      );
    }
    console.error("[appointments/video] failed:", (e as any)?.message);
    return NextResponse.json(
      {
        error: "Could not open the consultation just now.",
        errorPt: "Não foi possível abrir a consulta agora.",
      },
      { status: 500 }
    );
  }
}
