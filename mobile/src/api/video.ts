import { apiFetch } from "./client";

/**
 * Entrar na consulta por vídeo (089 T-3).
 *
 * Tudo o que decide quem entra está no servidor: que a pessoa é uma das duas da
 * consulta, que a consulta é por vídeo e não foi desmarcada, e que agora está
 * dentro da janela do horário. Aqui só se pede.
 *
 * O token vem por chamada e não se guarda: ele vale só desta pessoa, só desta
 * sala e só desta janela. Guardá-lo faria dele uma chave reutilizável.
 */
export interface EntradaNaConsulta {
  url: string;
  token: string;
  nome: string;
  ehTerapeuta: boolean;
  comeca: string;
  duracaoMin: number;
}

export type MotivoDeNaoEntrar =
  | "too_early"
  | "too_late"
  | "not_video"
  | "not_scheduled"
  | "video_unavailable"
  | "provider_error"
  | "desconhecido";

export class NaoDeuParaEntrar extends Error {
  constructor(
    public motivo: MotivoDeNaoEntrar,
    /** O ingles, que e a lingua primaria e a reserva. */
    message: string,
    /** O portugues, quando o servidor mandou. */
    public messagePt?: string
  ) {
    super(message);
  }

  /**
   * A frase no idioma do aparelho.
   *
   * A escolha mora aqui e nao no modulo de API porque quem sabe o idioma e a
   * **tela** — `localizada(lang)` do `ApiError` pede o idioma justamente por
   * isso, e eu estava chamando sem argumento.
   */
  texto(lang: string): string {
    return lang === "pt" && this.messagePt ? this.messagePt : this.message;
  }
}

export async function entrarNaConsulta(appointmentId: string): Promise<EntradaNaConsulta> {
  try {
    return await apiFetch<EntradaNaConsulta>(`/api/appointments/${appointmentId}/video`, {
      method: "POST",
    });
  } catch (e: any) {
    /**
     * O erro vem como `ApiError`, e e dele que sai o texto na lingua certa.
     *
     * Eu lia `e.body ?? e.data` — **nenhum dos dois existe**. O `apiFetch` lanca
     * `ApiError(status, message, code, messagePt)`. O resultado: `corpo` era
     * sempre `{}`, o motivo era sempre "desconhecido" (a uniao inteira virava
     * codigo morto), e o texto caia no `e.message`, que e o ingles. Uma paciente
     * em pt-BR lia "This consultation has not opened yet."
     *
     * E a mesma regressao que o docstring do `ApiError` diz ter consertado em
     * 26/09. Achado do code review de 27/09/2026.
     */
    const motivo = (e?.code as MotivoDeNaoEntrar) ?? "desconhecido";
    throw new NaoDeuParaEntrar(
      motivo,
      e?.message || "Could not join the consultation.",
      e?.messagePt
    );
  }
}

/**
 * Quando a pessoa pode entrar — a mesma folga que o servidor aplica.
 *
 * Repetida aqui **só para decidir o que mostrar**, nunca para autorizar: um
 * botão escondido continua sendo uma requisição que alguém pode fazer à mão, e
 * quem recusa é o servidor. Se as duas discordarem, quem manda é ele.
 */
export const FOLGA_ANTES_MIN = 10;
export const FOLGA_DEPOIS_MIN = 30;

export function janelaAberta(comeca: string | Date, duracaoMin: number, agora = new Date()): boolean {
  const inicio = new Date(comeca).getTime() - FOLGA_ANTES_MIN * 60_000;
  const fim = new Date(comeca).getTime() + (duracaoMin + FOLGA_DEPOIS_MIN) * 60_000;
  const t = agora.getTime();
  return t >= inicio && t <= fim;
}
