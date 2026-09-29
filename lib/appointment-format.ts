import type { AppointmentMode } from "@prisma/client";

/**
 * Quem pode pedir qual formato, e o que está pendente (098 T-1).
 *
 * ## Por que num lugar só
 *
 * Três telas e duas rotas precisam da mesma resposta: o seletor do app (para
 * saber o que oferecer), a rota de agendar (para recusar o que a tela não
 * deveria ter oferecido), a fila do painel, a rota que decide, e a tela da
 * consulta. Cinco cópias da regra é a garantia de que uma delas vai oferecer
 * vídeo para uma eletroterapia.
 *
 * ## A regra, em uma frase
 *
 * **Nada de oferecer o que não pode acontecer.** Eletroterapia não vira vídeo;
 * domicílio sem endereço é um pedido que a clínica não consegue atender. É o
 * mesmo critério que mantém o botão do Google fora do Android.
 */

export type Formato = AppointmentMode;

/** O que o tipo de tratamento permite. Só os dois campos que importam. */
export interface TratamentoParaFormato {
  /** `true` em eletroterapia e afins — impede o vídeo. */
  requiresInPerson: boolean;
  /** Ligado por tipo de tratamento, no painel (T-5). Nasce `false`. */
  allowsHomeVisit: boolean;
}

/**
 * O que a **clínica** permite quando não há tipo de tratamento.
 *
 * O Bruno: *"os tipos de tratamento da clinic só crio personalizado depois de
 * atender o paciente"*. A primeira consulta, que é a única que o paciente marca
 * sozinho, nunca tem tipo — então sem isto o seletor de formato jamais aparece.
 */
export interface ClinicaParaFormato {
  consultationAllowsVideo: boolean;
  consultationAllowsHomeVisit: boolean;
}

/** O endereço do paciente, como ele está no cadastro (081 separou os três). */
export interface EnderecoDoPaciente {
  address?: string | null;
  city?: string | null;
  postcode?: string | null;
}

/**
 * O endereço está completo o bastante para alguém ir até lá?
 *
 * Os três juntos, e não só a rua: um terapeuta precisa da cidade para saber se
 * vai, e do código postal para achar a porta. Um `address` solto com "casa 3"
 * é um pedido que não dá para atender.
 */
export function enderecoCompleto(p: EnderecoDoPaciente | null | undefined): boolean {
  if (!p) return false;
  return [p.address, p.city, p.postcode].every((v) => !!v && v.trim().length > 0);
}

/**
 * Os formatos que **esta pessoa** pode pedir para **este tratamento**.
 *
 * `IN_PERSON` está sempre na lista: é o padrão, e não é pedido — é o que
 * acontece quando ninguém pede nada.
 */
export function formatosPermitidos(
  tratamento: TratamentoParaFormato | null | undefined,
  paciente: EnderecoDoPaciente | null | undefined,
  clinica?: ClinicaParaFormato | null
): Formato[] {
  const formatos: Formato[] = ["IN_PERSON"];

  /**
   * Sem tipo de tratamento, quem responde é a **clínica**.
   *
   * Este ramo não é uma queda de emergência: para a BPR ele é o caminho normal,
   * porque o tratamento nasce personalizado depois da avaliação e a primeira
   * consulta nunca tem tipo. Sem ele, o seletor de formato existia no código e
   * era invisível na prática.
   */
  if (!tratamento) {
    if (!clinica) return formatos;
    if (clinica.consultationAllowsVideo) formatos.push("VIDEO");
    if (clinica.consultationAllowsHomeVisit && enderecoCompleto(paciente)) {
      formatos.push("HOME_VISIT");
    }
    return formatos;
  }

  if (!tratamento.requiresInPerson) formatos.push("VIDEO");
  if (tratamento.allowsHomeVisit && enderecoCompleto(paciente)) formatos.push("HOME_VISIT");

  return formatos;
}

/**
 * Por que o domicílio não apareceu?
 *
 * A tela precisa distinguir "este tratamento não sai da clínica" de "falta o
 * seu endereço" — a primeira é um fato, a segunda é algo que a pessoa resolve
 * em trinta segundos. Uma frase só para as duas mandaria metade das pessoas
 * para o lugar errado.
 */
export function porQueSemDomicilio(
  tratamento: TratamentoParaFormato | null | undefined,
  paciente: EnderecoDoPaciente | null | undefined,
  clinica?: ClinicaParaFormato | null
): "tratamento" | "endereco" | null {
  // Sem tipo de tratamento, quem permite é a clínica — e a resposta tem de
  // distinguir "a clínica não faz" de "falta o seu endereço". Dizer
  // "tratamento" quando não há tratamento nenhum mandaria a pessoa procurar
  // algo que não existe.
  const permite = tratamento ? tratamento.allowsHomeVisit : !!clinica?.consultationAllowsHomeVisit;
  if (!permite) return "tratamento";
  if (!enderecoCompleto(paciente)) return "endereco";
  return null;
}

export interface ConsultaComPedido {
  requestedMode?: Formato | null;
  modeApprovedAt?: Date | null;
  modeRefusedReason?: string | null;
}

/** Pediu alguma coisa e ninguém decidiu ainda. */
export function pedidoPendente(c: ConsultaComPedido | null | undefined): boolean {
  if (!c?.requestedMode) return false;
  return !c.modeApprovedAt && !c.modeRefusedReason;
}

export type EstadoDoPedido = "nenhum" | "pendente" | "aprovado" | "recusado";

/** Em que pé está o pedido — o que as três telas mostram. */
export function estadoDoPedido(c: ConsultaComPedido | null | undefined): EstadoDoPedido {
  if (!c?.requestedMode) return "nenhum";
  if (c.modeApprovedAt) return "aprovado";
  if (c.modeRefusedReason) return "recusado";
  return "pendente";
}

/**
 * O pedido que chegou do cliente é aceitável?
 *
 * A tela do app já filtra o que oferece, mas **a tela não é a tranca**: quem
 * manda o corpo da requisição escolhe o que quiser. Sem esta checagem no
 * servidor, um `requestedMode: "HOME_VISIT"` entraria para um tratamento que
 * nunca sai da clínica, e alguém teria de recusar à mão.
 */
export function pedidoAceitavel(
  pedido: unknown,
  tratamento: TratamentoParaFormato | null | undefined,
  paciente: EnderecoDoPaciente | null | undefined
): { ok: true; formato: Formato | null } | { ok: false; erro: string } {
  if (pedido === undefined || pedido === null || pedido === "") {
    return { ok: true, formato: null };
  }
  if (typeof pedido !== "string") return { ok: false, erro: "Invalid appointment format" };

  const permitidos = formatosPermitidos(tratamento, paciente);
  if (!permitidos.includes(pedido as Formato)) {
    return { ok: false, erro: "That format is not available for this treatment" };
  }

  // Pedir o que já é o padrão não é pedido nenhum: guardá-lo criaria uma fila
  // de aprovações para consultas que não mudam de lugar.
  if (pedido === "IN_PERSON") return { ok: true, formato: null };

  return { ok: true, formato: pedido as Formato };
}
