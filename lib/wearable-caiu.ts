import { prisma } from "@/lib/db";
import { createAlert } from "@/lib/alerts";
import { sendAdminAlert } from "@/lib/admin-alert-email";
import { deliveryState } from "@/lib/withings-subscriptions";
import { daysSilent, isSilent, silenceThreshold } from "@/lib/wearable-silence";
import { AlertPriority } from "@prisma/client";

/**
 * Quando a ligação de um paciente cai, a clínica fica a saber (114 T-7).
 *
 * O Bruno, 30/09/2026: *"se cair a conexão da API na conta do paciente, precisa
 * aparecer uma notificação para o paciente e para a clínica dizendo que a
 * conexão foi perdida e que ele precisa reconectar."*
 *
 * Até aqui, nada acontecia. A ligação emudecia e a única forma de descobrir era
 * alguém abrir a tela e reparar — o que costuma ser justamente quando já se
 * precisava das leituras.
 *
 * ## Duas maneiras de cair, e elas não são a mesma notícia
 *
 * | motivo | o que significa | quem resolve |
 * |---|---|---|
 * | **não entrega** (`silent`, `partial`, `unchecked`) | o provedor não está a avisar — assinatura caída, autorização expirada | pode precisar da senha, e aí **só o paciente** |
 * | **calada** (`receiving` e nada há dias) | a promessa está em dia; o aparelho é que não mede | o paciente, fisicamente — tomada, bateria, hábito |
 *
 * Separá-las importa porque o conselho é diferente, e um aviso que manda
 * reconectar um aparelho que está perfeitamente ligado gasta a paciência de
 * quem o lê. Da terceira vez ninguém lê mais.
 *
 * ## Porquê um `Alert`, e não um e-mail direto
 *
 * A clínica já tem uma tela para "coisas que precisam de atenção", e os alertas
 * de pressão já passam por ali. `createAlert` deduplica pelo dia: devolve
 * `created: false` quando o alerta de hoje já existia, e é isso que impede o
 * cron — que corre de duas em duas horas — de mandar doze e-mails por dia sobre
 * a mesma ligação muda.
 *
 * **O paciente não recebe mensagem daqui.** A regra da casa é não enviar a
 * paciente automaticamente; o lado dele é um aviso **dentro do app**, na tela
 * de dispositivos, que já mostra o estado. Isto é o lado da clínica.
 */

export const REGRA_LIGACAO_CAIU = "WEARABLE_DISCONNECTED";

export interface LigacaoParaAvaliar {
  status?: string | null;
  lastReadingAt?: Date | string | null;
  createdAt?: Date | string | null;
  notifyCheckedAt?: Date | null;
  notifyConfirmedAppli?: number[] | null;
}

export type MotivoDaQueda = "nao-entrega" | "calada" | null;

/**
 * Porque esta ligação conta como caída — ou `null` quando está bem.
 *
 * `DISCONNECTED` não conta: quem desligou sabe que não vai receber, e avisar
 * disso seria avisar de uma decisão da própria pessoa.
 */
export function motivoDaQueda(
  ligacao: LigacaoParaAvaliar,
  limiteDias: number
): MotivoDaQueda {
  if (ligacao.status === "DISCONNECTED") return null;
  const entrega = deliveryState(ligacao);
  if (entrega !== "receiving") return "nao-entrega";
  if (isSilent({ ...ligacao, status: ligacao.status ?? undefined }, limiteDias)) return "calada";
  return null;
}

/** O dia, para deduplicar — o mesmo fuso que o resto dos alertas usa. */
function janelaDoDia(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

/**
 * Avalia uma ligação e, se ela caiu, cria o alerta do dia e avisa a clínica.
 *
 * Devolve o motivo quando avisou agora, e `null` quando não havia o que avisar
 * ou o aviso de hoje já existia — para o cron poder contar sem contar duas
 * vezes.
 */
export async function avisarSeCaiu(
  connectionId: string,
  userId: string,
  ligacao: LigacaoParaAvaliar
): Promise<MotivoDaQueda> {
  const paciente = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, clinicId: true },
  });
  if (!paciente?.clinicId) return null;

  const limite = await silenceThreshold(paciente.clinicId);
  const motivo = motivoDaQueda(ligacao, limite);
  if (!motivo) return null;

  const nome = `${paciente.firstName ?? ""} ${paciente.lastName ?? ""}`.trim() || "A patient";
  const dias = daysSilent(ligacao);

  const titulo =
    motivo === "nao-entrega"
      ? `Device not sending: ${nome}`
      : `Device silent for ${dias} days: ${nome}`;
  const tituloPt =
    motivo === "nao-entrega"
      ? `Aparelho não está enviando: ${nome}`
      : `Aparelho calado há ${dias} dias: ${nome}`;

  const { created } = await createAlert({
    clinicId: paciente.clinicId,
    patientId: userId,
    ruleCode: REGRA_LIGACAO_CAIU,
    window: janelaDoDia(),
    title: titulo,
    titlePt: tituloPt,
    priority: AlertPriority.MEDIUM,
    details: {
      connectionId,
      motivo,
      daysSilent: dias,
      delivery: deliveryState(ligacao),
    },
  });

  // Só o primeiro do dia sai por e-mail. O cron corre de duas em duas horas, e
  // sem isto seriam doze mensagens sobre a mesma ligação muda.
  if (created) {
    const comoResolver =
      motivo === "nao-entrega"
        ? "The clinic can try reconnecting. If the provider asks for the patient's own password, only the patient can do it, from the app."
        : "The authorisation is fine — the device is not measuring. Check that it is plugged in and being used.";

    await sendAdminAlert({
      clinicId: paciente.clinicId,
      subject: `⌚ ${titulo}`,
      title: motivo === "nao-entrega" ? "Device not sending" : "Device silent",
      intro: comoResolver,
      rows: [
        { label: "Patient", value: nome },
        {
          label: "Reason",
          value:
            motivo === "nao-entrega"
              ? "The provider is not notifying us"
              : `No reading for ${dias} days`,
        },
      ],
    }).catch((err: any) => console.error("[wearable-caiu] admin e-mail:", err?.message));
  }

  return created ? motivo : null;
}
