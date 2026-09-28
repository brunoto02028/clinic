import { prisma } from "@/lib/db";
import { activePackageFor } from "@/lib/package-sessions";
import { servicePricesForPatient, patientBookingPrice } from "@/lib/service-price";

/**
 * O que acontece se **este** paciente marcar agora.
 *
 * O app não pergunta que tipo de marcação é. Ele mostra um botão, e isto
 * decide o que está atrás dele — porque só o servidor sabe se há sessão no
 * pacote, se a triagem foi feita e quanto custa.
 *
 * A mesma função responde à tela e à marcação. Duas implementações da mesma
 * pergunta seria a tela prometendo um preço e o servidor cobrando outro.
 *
 * **O preço nunca vem do cliente.** Um paciente já marcou a própria sessão por
 * GBP 0,30 — está escrito em `app/api/appointments/[id]/route.ts`, no comentário
 * que restringe o que ele pode alterar. Aqui o valor é lido da tabela da
 * clínica, e o que vier no corpo é ignorado.
 */

export type BookingKind = "FIRST_CONSULTATION" | "PACKAGE_SESSION" | "EXTRA_SESSION";
export type BookingBlock = "screening_required" | "no_clinic" | "price_not_set";

export interface BookingOption {
  /** `null` quando bloqueado. */
  kind: BookingKind | null;
  blockedReason?: BookingBlock;
  price: number;
  currency: string;
  /** Se o horário só fica reservado depois do pagamento. */
  requiresPayment: boolean;
  /** `null` no pacote ilimitado, ausente quando não há pacote. */
  sessionsRemaining: number | null;
  sessionsIncluded: number | null;
  patientPackageId: string | null;
}

/** Consulta que já aconteceu ou está de pé — cancelada não conta como história. */
const CONTA_COMO_HISTORICO = ["PENDING", "PENDING_PATIENT", "CONFIRMED", "COMPLETED", "NO_SHOW"];

export async function bookingOptionsFor(patientId: string): Promise<BookingOption> {
  const vazio = {
    price: 0,
    currency: "GBP",
    requiresPayment: false,
    sessionsRemaining: null,
    sessionsIncluded: null,
    patientPackageId: null,
  };

  const paciente = await prisma.user.findUnique({
    where: { id: patientId },
    select: {
      clinicId: true,
      medicalScreening: { select: { isSubmitted: true } },
      clinic: { select: { extraSessionPayment: true } },
    },
  });

  if (!paciente?.clinicId) {
    return { kind: null, blockedReason: "no_clinic", ...vazio };
  }

  // A triagem é o pré-requisito clínico que já existia para ver o resto do
  // app. Marcar sem ela seria a clínica recebendo alguém de quem não sabe nada.
  if (paciente.medicalScreening?.isSubmitted !== true) {
    return { kind: null, blockedReason: "screening_required", ...vazio };
  }

  const clinicId = paciente.clinicId;
  // Os preços deste paciente: a exceção dele, quando existe, vence a da clínica (082).
  const precos = await servicePricesForPatient(clinicId, patientId);
  const moeda = precos[0]?.currency || "GBP";

  // 1) Tem sessão comprada? Ela vem primeiro — o paciente já pagou por isto.
  const pacote = await activePackageFor(patientId, clinicId);
  if (pacote) {
    return {
      kind: "PACKAGE_SESSION",
      price: 0,
      currency: moeda,
      requiresPayment: false,
      sessionsRemaining: pacote.remaining,
      sessionsIncluded: pacote.included,
      patientPackageId: pacote.patientPackageId,
    };
  }

  // 2) Nunca teve consulta nenhuma: é a primeira, e a primeira paga no ato.
  //    Com paciente novo não existe relação, e o pagamento é o que transforma
  //    um desconhecido num horário reservado.
  const jaTeveConsulta = await prisma.appointment.count({
    where: { patientId, status: { in: CONTA_COMO_HISTORICO as any } },
  });

  if (jaTeveConsulta === 0) {
    // Sem preço configurado não há primeira consulta a oferecer. O padrão de
    // £60 que existia aqui cobrava um número que ninguém escolheu — e escondia
    // do Bruno que o interruptor "Active" da tela de preços estava desligado.
    const preco = await patientBookingPrice(clinicId, patientId);
    if (preco === null) {
      return { kind: null, blockedReason: "price_not_set", ...vazio };
    }
    return {
      kind: "FIRST_CONSULTATION",
      price: preco,
      currency: moeda,
      requiresPayment: true,
      sessionsRemaining: null,
      sessionsIncluded: null,
      patientPackageId: null,
    };
  }

  // 3) Em tratamento, sem sessão sobrando: extra. Quem já confia em você não
  //    precisa pagar adiantado — mas a clínica decide.
  const sessao = precos.find((p) => p.serviceType === "TREATMENT_SESSION");
  const precoExtra = sessao ? sessao.price : await patientBookingPrice(clinicId, patientId);
  if (precoExtra === null) {
    return { kind: null, blockedReason: "price_not_set", ...vazio };
  }
  return {
    kind: "EXTRA_SESSION",
    price: precoExtra,
    currency: moeda,
    requiresPayment: paciente.clinic?.extraSessionPayment === "AT_BOOKING",
    sessionsRemaining: null,
    sessionsIncluded: null,
    patientPackageId: null,
  };
}
