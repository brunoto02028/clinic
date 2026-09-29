import { STATUS_ABERTOS } from "./appointment-status";
import { t as tr, type Lang } from "./i18n";

/**
 * Pedir para desmarcar — **pedir**, não desmarcar (103 T-4).
 *
 * A rota já existia inteira e nenhuma tela do aplicativo a chamava. Quem não
 * podia vir ligava, ou não aparecia; e não aparecer vira falta que ninguém
 * entende — nem quem faltou, nem quem esperou.
 *
 * A distinção que este arquivo existe para proteger: **a clínica decide**. A
 * tela que disser "cancelado" antes disso manda a pessoa embora achando que
 * resolveu, e no dia seguinte alguém cobra uma falta.
 */

/**
 * A mesma janela do servidor (`CANCELLATION_WINDOW_HOURS`, em
 * `app/api/patient/cancellation/route.ts`). Dentro dela a política prevê
 * cobrança de 50%, e é por isso que a antecedência aparece **antes** do envio:
 * é o número que muda a resposta.
 */
export const JANELA_HORAS = 24;

/** Horas até a consulta. Negativo quando ela já começou. */
export function horasDeAntecedencia(
  dateTime: string | Date | null | undefined,
  agora: number = Date.now()
): number | null {
  const inicio = dateTime ? new Date(dateTime).getTime() : NaN;
  if (!Number.isFinite(inicio)) return null;
  return (inicio - agora) / 3_600_000;
}

/**
 * Só consulta futura e em aberto oferece o botão.
 *
 * Consulta que já passou não se desmarca — se ninguém apareceu, o que existe é
 * um desfecho a registrar, e isso é da clínica (103 T-2). Já cancelada,
 * concluída ou com falta marcada também não: o desfecho já existe.
 */
export function podePedirCancelamento(
  status: string | null | undefined,
  dateTime: string | Date | null | undefined,
  agora: number = Date.now()
): boolean {
  if (!status || !STATUS_ABERTOS.includes(status as (typeof STATUS_ABERTOS)[number])) return false;
  const horas = horasDeAntecedencia(dateTime, agora);
  return horas !== null && horas > 0;
}

export type EstadoDoPedido = "nenhum" | "pendente" | "aprovado" | "recusado";

/**
 * O que a clínica já respondeu sobre esta consulta.
 *
 * Sem isto a tela deixa pedir de novo e a pessoa leva de volta um erro cru do
 * servidor — *"já existe uma solicitação"* — como se tivesse feito algo errado.
 */
/**
 * Já existe pedido — de qualquer espécie — para esta consulta?
 *
 * O que fecha a porta não é só o pedido pendente. O painel tem **dois** botões:
 * aprovar e, depois, reembolsar; e só o segundo cancela a consulta de verdade.
 * Entre um e outro o pedido está `APPROVED` e a consulta segue `CONFIRMED` e no
 * futuro — exatamente o estado em que a tela oferecia pedir de novo, para o
 * servidor responder *"já existe uma solicitação"*. O servidor recusa `PENDING`
 * **e** `APPROVED`; a tela tem de saber dos dois.
 */
export function jaPediu(estado: EstadoDoPedido): boolean {
  return estado !== "nenhum";
}

export function estadoDoPedido(
  pedidos: Array<{ appointmentId?: string | null; status?: string | null }> | null | undefined,
  appointmentId: string
): EstadoDoPedido {
  const meu = (pedidos ?? []).find((p) => p.appointmentId === appointmentId);
  const s = meu?.status?.toUpperCase();
  if (s === "PENDING") return "pendente";
  if (s === "APPROVED") return "aprovado";
  if (s === "REJECTED" || s === "DECLINED") return "recusado";
  return "nenhum";
}

/**
 * O que a pessoa lê antes de enviar.
 *
 * A antecedência em horas e, quando ela é curta, a política — sem inventar
 * valor nenhum: o cálculo do reembolso é do servidor, e repeti-lo aqui seria
 * uma segunda versão da regra para divergir depois.
 */
export function avisoDaAntecedencia(horas: number | null, lang: Lang) {
  if (horas === null || horas <= 0) return null;
  const minutos = Math.max(1, Math.round(horas * 60));
  const arredondado = Math.round(horas);
  const quando =
    // Abaixo de uma hora, minutos. `Math.max(1, ...)` sobre as horas dizia
    // "cerca de 1 hora" para vinte minutos — e o número que sobra é justamente
    // o que decide se dá tempo de avisar.
    horas < 1
      ? tr(lang, {
          en: `Your appointment is in about ${minutos} minute${minutos === 1 ? "" : "s"}.`,
          pt: `Sua consulta é em cerca de ${minutos} minuto${minutos === 1 ? "" : "s"}.`,
        })
      : arredondado < 48
      ? tr(lang, {
          en: `Your appointment is in about ${arredondado} hour${arredondado === 1 ? "" : "s"}.`,
          pt: `Sua consulta é em cerca de ${arredondado} hora${arredondado === 1 ? "" : "s"}.`,
        })
      : tr(lang, {
          en: `Your appointment is in about ${Math.round(horas / 24)} days.`,
          pt: `Sua consulta é em cerca de ${Math.round(horas / 24)} dias.`,
        });
  const politica =
    horas < JANELA_HORAS
      ? tr(lang, {
          en: `Cancellations within ${JANELA_HORAS} hours are subject to a 50% charge.`,
          pt: `Cancelamentos com menos de ${JANELA_HORAS} horas estão sujeitos a cobrança de 50%.`,
        })
      : null;
  return { quando, politica, dentroDaJanela: horas < JANELA_HORAS };
}

/**
 * Depois de enviar: **pedido enviado**, nunca "cancelado".
 *
 * A consulta continua na agenda até alguém da clínica decidir, e a tela tem de
 * deixar isso sem margem.
 */
export const TEXTO_DO_PEDIDO = {
  botao: { en: "Request cancellation", pt: "Pedir cancelamento" },
  titulo: { en: "Request cancellation", pt: "Pedir cancelamento" },
  motivoRotulo: { en: "Why can't you make it?", pt: "Por que você não pode vir?" },
  motivoDica: { en: "The clinic reads this to decide.", pt: "A clínica lê isto para decidir." },
  enviar: { en: "Send request", pt: "Enviar pedido" },
  enviando: { en: "Sending…", pt: "Enviando…" },
  semMotivo: { en: "Please say why — the clinic reads it to decide.", pt: "Diga o motivo — a clínica lê para decidir." },
  enviado: { en: "Request sent", pt: "Pedido enviado" },
  enviadoCorpo: {
    en: "The clinic will review it and reply. Your appointment stays booked until then.",
    pt: "A clínica vai analisar e responder. Sua consulta continua marcada até lá.",
  },
  aprovado: { en: "Cancellation approved", pt: "Cancelamento aprovado" },
  aprovadoCorpo: {
    en: "The clinic accepted it. Any refund is handled by the clinic.",
    pt: "A clínica aceitou. Qualquer reembolso é tratado por ela.",
  },
  pendente: { en: "Cancellation requested", pt: "Cancelamento pedido" },
  pendenteCorpo: {
    en: "Waiting for the clinic to reply. The appointment is still booked.",
    pt: "Aguardando a resposta da clínica. A consulta continua marcada.",
  },
  recusado: { en: "Cancellation declined", pt: "Cancelamento recusado" },
  recusadoCorpo: {
    en: "The clinic kept the appointment. Talk to them if something changed.",
    pt: "A clínica manteve a consulta. Fale com ela se algo mudou.",
  },
} as const;
