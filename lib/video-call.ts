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

/**
 * Uma recusa **esperada** da Daily, que o chamador já sabe tratar.
 *
 * Entrar numa consulta duas vezes é o caminho normal, e na segunda a Daily
 * responde `400 a room named … already exists` — o código busca a sala
 * existente logo depois. O log, porém, registrava isso como erro a cada
 * entrada, e um `console.error` no caminho feliz ensina a ignorar log: quando
 * um 400 de verdade aparecer, ele vai estar no meio dos falsos.
 *
 * Silenciar o 400 inteiro esconderia o de verdade junto, então o que se diz é
 * **qual** mensagem é esperada, e só essa desce para `debug`.
 */
function recusaEsperada(corpo: string, esperado?: RegExp): boolean {
  return !!esperado && esperado.test(corpo);
}

async function daily<T>(
  caminho: string,
  init: RequestInit,
  /** Um padrão que, se casar com o corpo da recusa, tira o alarme do log. */
  esperado?: RegExp
): Promise<T> {
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
    const linha = `[video-call] Daily ${caminho} ${res.status}: ${corpo.slice(0, 300)}`;
    if (recusaEsperada(corpo, esperado)) console.debug(linha);
    else console.error(linha);
    throw new VideoCallError("The video service refused the request.", 502, "provider_error");
  }
  return (await res.json()) as T;
}

/**
 * A janela em que a chamada aceita gente, em segundos desde a época.
 *
 * `antesMin` vem da clínica (`videoEarlyMinutes`), e não mais de uma constante:
 * dez minutos não cobrem o profissional que está pronto antes e quer chamar.
 * Quando ninguém passa nada, vale o padrão de sempre.
 */
export function janelaDaConsulta(
  dateTime: Date,
  duracaoMin: number,
  antesMin: number = FOLGA_ANTES_MIN
) {
  const antes = Number.isFinite(antesMin) && antesMin >= 0 ? antesMin : FOLGA_ANTES_MIN;
  const inicio = Math.floor(dateTime.getTime() / 1000) - antes * 60;
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
  config?: { exp?: number };
}

/** As propriedades da sala, num lugar só — usadas ao criar e ao atualizar. */
function propriedadesDaSala(fim: number) {
  return {
    exp: fim,
    eject_at_room_exp: true,
    // Sem gravação: nenhuma propriedade de gravação é enviada, e isto é uma
    // decisão, não um esquecimento (092 T-5).
    enable_chat: true,
    enable_screenshare: true,
    /**
     * A sala pergunta antes de pôr a pessoa no ar (review de 27/09/2026).
     *
     * Sem isto, tocar em "Entrar agora" já transmitia: a paciente que abre dez
     * minutos antes, da cama, aparece — e o terapeuta que abre `/video-room`
     * "só para ver se funciona" entra ao vivo para quem já estava lá. Numa
     * consulta, esse meio segundo é a diferença entre entrar e ser flagrado.
     */
    enable_prejoin_ui: true,
    start_video_off: false,
    start_audio_off: false,
  };
}

/**
 * Cria a sala da consulta, ou devolve a que já existe — com a validade certa.
 *
 * Idempotente de propósito: marcar a consulta como vídeo duas vezes, ou um
 * retry de rede, não pode produzir duas salas — a segunda ficaria órfã e a
 * consulta apontaria para uma delas.
 *
 * ## E a sala reagendada, que ficava morta para sempre
 *
 * O nome é derivado do id da consulta e o `exp` era gravado **só na criação**.
 * Reagendar muda o `dateTime` e não tocava na Daily: a consulta de hoje às 10h
 * criava uma sala válida até 11h30 de hoje; movida para terça, a entrada de
 * terça reencontrava **aquela** sala, já expirada. Com `eject_at_room_exp`, quem
 * entrasse era expulso na hora — e como o nome é determinístico, toda tentativa
 * caía na mesma sala morta, sem nenhum caminho de conserto pela interface.
 *
 * Por isso o `GET` compara e, se divergir, atualiza. Achado do review de
 * 27/09/2026.
 */
export async function criarSalaDaConsulta(opts: {
  appointmentId: string;
  dateTime: Date;
  duracaoMin: number;
}): Promise<SalaCriada> {
  const name = nomeDaSala(opts.appointmentId);
  const { fim } = janelaDaConsulta(opts.dateTime, opts.duracaoMin);

  try {
    return await daily<SalaCriada>(
      "/rooms",
      {
        method: "POST",
        body: JSON.stringify({ name, privacy: "private", properties: propriedadesDaSala(fim) }),
      },
      // Sala que já existe é o caminho normal da segunda entrada — o `catch`
      // abaixo busca a existente. Qualquer outro 400 continua sendo erro.
      /already exists/i
    );
  } catch (e) {
    // Sala que já existe volta 400 da Daily. Buscar é o caminho idempotente.
    if (!(e instanceof VideoCallError) || e.code !== "provider_error") throw e;

    const existente = await daily<SalaCriada>(`/rooms/${name}`, { method: "GET" });

    // A validade guardada é a do horário de antes do reagendamento. Igualar é
    // o que impede a sala morta.
    if (existente.config?.exp !== fim) {
      return await daily<SalaCriada>(`/rooms/${name}`, {
        method: "POST",
        body: JSON.stringify({ properties: propriedadesDaSala(fim) }),
      });
    }

    return existente;
  }
}

/**
 * A hora está dentro da janela? Lança dizendo qual das duas pontas falhou.
 *
 * Separada de `tokenParaEntrar` no review de 27/09/2026. Estava **dentro** dele,
 * e o chamador criava a sala antes — então abrir uma consulta da semana passada
 * tentava criar uma sala com `exp` no passado, a Daily recusava, e a pessoa lia
 * *"o serviço de vídeo recusou o pedido"* em vez de *"esta consulta já
 * terminou"*. Pior: qualquer toque no endpoint criava sala, contrariando o
 * "a sala só existe se alguém de fato vai usá-la".
 */
export function exigirJanelaAberta(
  dateTime: Date,
  duracaoMin: number,
  agora = new Date(),
  antesMin: number = FOLGA_ANTES_MIN
): void {
  const { inicio, fim } = janelaDaConsulta(dateTime, duracaoMin, antesMin);
  const t = Math.floor(agora.getTime() / 1000);
  /**
   * O inglês diz **a partir de quando**, como o português já dizia.
   *
   * "This consultation has not opened yet." deixa a pessoa sem saber se espera
   * um minuto ou uma hora — e o inglês é a língua primária da casa, então era a
   * versão pior que a maioria lia. A frase do app (`mobile/.../consulta-video`)
   * já vinha completa; esta é a mesma.
   */
  if (t < inicio)
    throw new VideoCallError(
      `This consultation has not opened yet. You can join from ${antesMin} minutes before.`,
      409,
      "too_early"
    );
  if (t > fim) throw new VideoCallError("This consultation has ended.", 409, "too_late");
}

export async function tokenParaEntrar(opts: {
  appointmentId: string;
  dateTime: Date;
  duracaoMin: number;
  nome: string;
  ehTerapeuta: boolean;
  agora?: Date;
}): Promise<string> {
  const { inicio, fim } = janelaDaConsulta(opts.dateTime, opts.duracaoMin);
  // Conferida de novo aqui: quem chama pode esquecer, e emitir token fora da
  // janela e a guarda de quem chama não são a mesma garantia.
  exigirJanelaAberta(opts.dateTime, opts.duracaoMin, opts.agora);

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
        /**
         * A garantia de nao gravar e a **sala**, nao este campo.
         *
         * `enable_recording` no meeting-token espera uma string (`"cloud"`,
         * `"local"`, `"raw-tracks"`), e o `false` que estava aqui era
         * codificado como `er: ""` no JWT — engolido em silencio. O QA de
         * 27/09/2026 mediu isso.
         *
         * Nao mando mais nada: a sala nao tem propriedade de gravacao nenhuma,
         * e e de la que a garantia vem. Um campo que parece impedir e nao
         * impede e pior que campo nenhum, porque quem le para de procurar.
         */
      },
    }),
  });

  return r.token;
}

/**
 * De quantos minutos antes **esta pessoa** pode abrir a sala.
 *
 * Quem atende não fica preso à janela do paciente: a consulta é dele, e estar
 * pronto quarenta minutos antes é normal. O Bruno, em 29/09/2026: *"clico em
 * Join Video Call... diz que eu não posso entrar antes de 10 minutos"*.
 *
 * Para o terapeuta, a sala abre **no começo do dia da consulta**. Não é
 * ilimitado de propósito: abrir a de semana que vem criaria uma sala com `exp`
 * no passado e a Daily recusaria — foi o defeito que a 089 consertou. O dia é o
 * limite natural, e é o que uma agenda significa.
 *
 * Para o paciente vale o minuto da clínica. Se quem atende já abriu, ele entra
 * de qualquer jeito: a sala existindo é o sinal de que a consulta começou.
 */
export function minutosAntesPara(
  ehTerapeuta: boolean,
  dateTime: Date,
  minutosDaClinica: number = FOLGA_ANTES_MIN
): number {
  const daClinica =
    Number.isFinite(minutosDaClinica) && minutosDaClinica >= 0
      ? minutosDaClinica
      : FOLGA_ANTES_MIN;
  if (!ehTerapeuta) return daClinica;

  // Do começo do dia da consulta — no fuso do servidor, que é onde a agenda
  // vive. Nunca menos que o minuto da clínica.
  const inicioDoDia = new Date(dateTime);
  inicioDoDia.setHours(0, 0, 0, 0);
  const desdeOComecoDoDia = Math.ceil((dateTime.getTime() - inicioDoDia.getTime()) / 60000);
  return Math.max(daClinica, desdeOComecoDoDia);
}
