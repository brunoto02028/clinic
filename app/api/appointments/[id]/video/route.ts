export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestSession } from "@/lib/dual-auth";
import { porContaDeNoBearer } from "@/lib/sessao-emprestada";
import { isProfissionalExterno } from "@/lib/tenant-type";
import {
  VideoCallError,
  criarSalaDaConsulta,
  exigirJanelaAberta,
  minutosAntesPara,
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
    // Com `errorPt`: a página da sala mostra `errorPt || error`, e sem o
    // português a pessoa lia "Unauthorized" cru no meio de uma tela em
    // português (achado 2 do QA de 27/09/2026).
    return NextResponse.json(
      {
        error: "Sign in again to join this consultation.",
        errorPt: "Entre de novo para acessar esta consulta.",
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
      dateTime: true,
      duration: true,
      status: true,
      patientId: true,
      therapistId: true,
      clinicId: true,
      videoRoomUrl: true,
      /**
       * De quantos minutos antes esta clínica abre a sala (29/09/2026).
       *
       * Da clínica **da consulta**, e não de quem pede: quem define o horário
       * de abrir é a casa que atende.
       */
      clinic: { select: { videoEarlyMinutes: true } },
      patient: { select: { firstName: true, lastName: true } },
      therapist: {
        select: {
          firstName: true,
          lastName: true,
          /**
           * O registro do profissional (102 T-7).
           *
           * Em consulta a distancia no Brasil, saber quem atende **faz parte
           * do atendimento** — e o nome sozinho nao diz. Quando quem atende e
           * um profissional que a BPR intermedia, o numero entra no nome que
           * aparece na sala.
           */
          clinic: {
            select: { type: true, professionalRegistry: true, registryKind: true },
          },
        },
      },
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
    /**
     * A frase é a mesma para "não existe" e "não é sua", de propósito — distinguir
     * as duas contaria a um estranho que aquela consulta existe.
     *
     * Mas ela **é** uma frase agora: era `{"error":"Not found"}`, e a pessoa lia
     * "Not found" cru, em inglês, numa página em português. String de
     * desenvolvedor virando texto de paciente (achado 2 do QA de 27/09/2026).
     */
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
      {
        error: "This consultation is in person.",
        errorPt: "Esta consulta é presencial.",
        code: "not_video",
      },
      { status: 409 }
    );
  }

  /**
   * Cancelada, faltou — e **concluída**.
   *
   * A janela de horário continuaria válida, então sem isto dava para entrar
   * numa consulta desmarcada. `COMPLETED` faltava: uma consulta que o terapeuta
   * já marcou como feita continuava abrindo a sala enquanto a janela não
   * fechasse — e o paciente, entrando, encontraria uma sala vazia de uma
   * consulta que já aconteceu.
   *
   * A rota de **chamar** fechou esse mesmo buraco no QA da 089 T-8 e esta ficou
   * para trás: as duas portas da mesma consulta discordavam sobre quando ela
   * existe.
   */
  if (
    consulta.status === "CANCELLED" ||
    consulta.status === "NO_SHOW" ||
    consulta.status === "COMPLETED"
  ) {
    return NextResponse.json(
      {
        error:
          consulta.status === "COMPLETED"
            ? "This consultation has already finished."
            : "This consultation is no longer scheduled.",
        errorPt:
          consulta.status === "COMPLETED"
            ? "Esta consulta já foi concluída."
            : "Esta consulta não está mais marcada.",
        code: "not_scheduled",
      },
      { status: 409 }
    );
  }

  const pessoa = ehTerapeuta ? consulta.therapist : consulta.patient;
  const nomeSimples = [pessoa?.firstName, pessoa?.lastName].filter(Boolean).join(" ") || "Participant";

  /**
   * O nome de quem atende leva o registro junto (102 T-7).
   *
   * So para profissional intermediado pela BPR: o terapeuta da reabilitacao
   * aparece como sempre apareceu, e acrescentar um numero vazio ao nome dele
   * seria pior que nao ter nenhum.
   */
  const registroDoTerapeuta =
    ehTerapeuta && isProfissionalExterno(consulta.therapist?.clinic?.type)
      ? [consulta.therapist?.clinic?.registryKind, consulta.therapist?.clinic?.professionalRegistry]
          .filter(Boolean)
          .join(" ")
      : "";
  const nomeDaPessoa = registroDoTerapeuta ? `${nomeSimples} (${registroDoTerapeuta})` : nomeSimples;

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
    /**
     * Quem atende abre desde o começo do dia; o paciente, pelo minuto da
     * clínica — ou a qualquer hora, se a sala já estiver aberta.
     */
    const jaAberta = !!consulta.videoRoomUrl;
    if (!(ehPaciente && jaAberta)) {
      exigirJanelaAberta(
        consulta.dateTime,
        consulta.duration,
        new Date(),
        minutosAntesPara(ehTerapeuta, consulta.dateTime, consulta.clinic?.videoEarlyMinutes)
      );
    }

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
