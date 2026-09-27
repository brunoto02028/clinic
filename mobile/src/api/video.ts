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
    public texto: string
  ) {
    super(texto);
  }
}

export async function entrarNaConsulta(appointmentId: string): Promise<EntradaNaConsulta> {
  try {
    return await apiFetch<EntradaNaConsulta>(`/api/appointments/${appointmentId}/video`, {
      method: "POST",
    });
  } catch (e: any) {
    /**
     * O corpo do erro carrega `code` e `errorPt`, e os dois importam: o `code`
     * decide o que a tela oferece (esperar, voltar, avisar a clínica) e o texto
     * é o que a pessoa lê. Sem separar, todo problema vira "erro".
     */
    const corpo = e?.body ?? e?.data ?? {};
    const motivo = (corpo.code as MotivoDeNaoEntrar) ?? "desconhecido";
    const texto = corpo.errorPt || corpo.error || e?.message || "Não foi possível entrar na consulta.";
    throw new NaoDeuParaEntrar(motivo, texto);
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
