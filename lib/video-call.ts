/**
 * A consulta por vídeo (089 T-1..T-3, e a T-5 da 092).
 *
 * ## O que existia antes disto
 *
 * `/admin/video-consultations` já marcava a consulta como `mode: VIDEO` e
 * gravava um `videoRoomUrl` — mas o id da sala era gerado **no navegador**, com
 * `generateRoomId()`, e a URL apontava para `/video-room/<id>`, **uma página que
 * não existe**. Ou seja: dava para marcar uma consulta por vídeo e ninguém
 * conseguia entrar, porque não havia sala em lugar nenhum e o botão abria 404.
 *
 * O `Appointment` já tem `mode`, `videoRoomId` e `videoRoomUrl`. O que faltava é
 * tudo o que decide **quem entra e quando**.
 *
 * ## As decisões que importam, e por quê
 *
 * **A sala é privada.** `privacy: "private"` na Daily significa que a URL não
 * basta: sem um token assinado por nós, ninguém entra. Uma sala pública cujo
 * endereço vaza num print de tela é uma consulta clínica aberta.
 *
 * **O token é preso à janela do horário.** `nbf` (not before) e `exp` saem da
 * consulta, com folga dos dois lados — a pessoa entra um pouco antes e a chamada
 * não cai no minuto exato. Fora dessa janela o token nem é emitido.
 *
 * **Um token por pessoa, e o terapeuta é o dono.** `is_owner` só para quem
 * atende: é quem pode admitir e remover. O paciente entra como participante.
 *
 * **Nada grava.** A 092 decidiu isso e aqui é onde a decisão vive: nenhuma
 * propriedade de gravação é enviada, e `enable_recording` fica de fora de
 * propósito. Gravar consulta é dado clínico com consentimento próprio, que já
 * existe separado para áudio.
 *
 * **E a sala expira.** `exp` na própria sala, mais `eject_at_room_exp`: uma sala
 * que fica de pé para sempre é uma porta aberta para sempre.
 */

const DAILY_API = "https://api.daily.co/v1";

/** Quanto antes do horário dá para entrar, e quanto depois a sala aguenta. */
export const FOLGA_ANTES_MIN = 10;
export const FOLGA_DEPOIS_MIN = 30;

/**
 * Dá para fazer chamada de vídeo hoje?
 *
 * Duas pontas, como no laboratório: a chave do provedor **e** o interruptor.
 * Sem as duas, a tela diz que a chamada abre em breve em vez de oferecer um
 * botão que promete e falha.
 */
export function videoCallsEnabled(): boolean {
  return !!process.env.DAILY_API_KEY && process.env.VIDEO_CALLS_ENABLED === "true";
}

export class VideoCallError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

function chave(): string {
  const k = process.env.DAILY_API_KEY;
  if (!k) throw new VideoCallError("Video calls are not configured.", 503, "video_unavailable");
  return k;
}

async function daily<T>(caminho: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${DAILY_API}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${chave()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    // A mensagem do provedor vai para o log, não para a resposta: ela pode
    // conter nome de sala e detalhe de conta.
    console.error(`[video-call] Daily ${caminho} ${res.status}: ${corpo.slice(0, 300)}`);
    throw new VideoCallError("The video service refused the request.", 502, "provider_error");
  }
  return (await res.json()) as T;
}

/** A janela em que a chamada aceita gente, em segundos desde a época. */
export function janelaDaConsulta(dateTime: Date, duracaoMin: number) {
  const inicio = Math.floor(dateTime.getTime() / 1000) - FOLGA_ANTES_MIN * 60;
  const fim = Math.floor(dateTime.getTime() / 1000) + (duracaoMin + FOLGA_DEPOIS_MIN) * 60;
  return { inicio, fim };
}

/**
 * O nome da sala, derivado da consulta.
 *
 * Derivado, e não aleatório: assim uma segunda chamada para a mesma consulta
 * reaproveita a sala em vez de criar outra, e o nome não carrega nada sobre o
 * paciente. A Daily aceita `[a-zA-Z0-9_-]`.
 */
export function nomeDaSala(appointmentId: string): string {
  return `consulta-${appointmentId}`.replace(/[^a-zA-Z0-9_-]/g, "");
}

export interface SalaCriada {
  name: string;
  url: string;
}

/**
 * Cria a sala da consulta, ou devolve a que já existe.
 *
 * Idempotente de propósito: marcar a consulta como vídeo duas vezes, ou um
 * retry de rede, não pode produzir duas salas — a segunda ficaria órfã e a
 * consulta apontaria para uma delas.
 */
export async function criarSalaDaConsulta(opts: {
  appointmentId: string;
  dateTime: Date;
  duracaoMin: number;
}): Promise<SalaCriada> {
  const name = nomeDaSala(opts.appointmentId);
  const { fim } = janelaDaConsulta(opts.dateTime, opts.duracaoMin);

  try {
    return await daily<SalaCriada>("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name,
        privacy: "private",
        properties: {
          exp: fim,
          eject_at_room_exp: true,
          // Sem gravação: nenhuma propriedade de gravação é enviada, e isto é
          // uma decisão, não um esquecimento (092 T-5).
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });
  } catch (e) {
    // Sala que já existe volta 400 da Daily. Buscar é o caminho idempotente.
    if (e instanceof VideoCallError && e.code === "provider_error") {
      return await daily<SalaCriada>(`/rooms/${name}`, { method: "GET" });
    }
    throw e;
  }
}

/**
 * O token de quem vai entrar — só dentro da janela.
 *
 * A checagem de horário mora **aqui**, e não na tela: a tela decide o que
 * mostrar, e isto decide o que existe. Um botão escondido continua sendo uma
 * requisição que alguém pode fazer à mão.
 */
export async function tokenParaEntrar(opts: {
  appointmentId: string;
  dateTime: Date;
  duracaoMin: number;
  nome: string;
  ehTerapeuta: boolean;
  agora?: Date;
}): Promise<string> {
  const { inicio, fim } = janelaDaConsulta(opts.dateTime, opts.duracaoMin);
  const agora = Math.floor((opts.agora ?? new Date()).getTime() / 1000);

  if (agora < inicio) {
    throw new VideoCallError("This consultation has not opened yet.", 409, "too_early");
  }
  if (agora > fim) {
    throw new VideoCallError("This consultation has ended.", 409, "too_late");
  }

  const r = await daily<{ token: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        room_name: nomeDaSala(opts.appointmentId),
        user_name: opts.nome,
        // Dono só quem atende: é quem admite e remove. O paciente entra como
        // participante, e não pode tirar ninguém da própria consulta.
        is_owner: opts.ehTerapeuta,
        nbf: inicio,
        exp: fim,
        enable_recording: false,
      },
    }),
  });

  return r.token;
}
