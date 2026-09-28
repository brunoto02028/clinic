export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { patientOrder, patientOrderInclude } from "@/lib/lab-patient";
import { labOrderingEnabled } from "@/lib/lab-ordering";
import { hasLabConsent } from "@/lib/lab-consent";
import { reviewModeFor } from "@/lib/lab-review-mode";
import { idadeEmAnos } from "@/lib/managed-patients";
import { HOME_KITS } from "@/lib/lab-catalog";

export function OPTIONS() {
  return corsPreflight();
}

/** Os pedidos do paciente, cada um com o estágio em que está (081, T-3). */
export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const [orders, clinic] = await Promise.all([
    prisma.labOrder.findMany({
      where: { patientId: payload.sub, status: { not: "BASKET" } },
      include: patientOrderInclude(),
      orderBy: { createdAt: "desc" },
    }),
    payload.clinicId
      ? prisma.clinic.findUnique({ where: { id: payload.clinicId }, select: { labReviewDays: true } })
      : Promise.resolve(null),
  ]);

  return corsJson({
    orders: orders.map(patientOrder),
    reviewDays: clinic?.labReviewDays ?? 2,
    orderingEnabled: labOrderingEnabled(),
  });
}

/**
 * Começa um pedido (081). O servidor decide o preço — o corpo traz produto e
 * quantidade, mais nada — e grava o custo do momento junto, para a margem
 * ficar congelada.
 *
 * Fechado enquanto a compra não estiver ligada de ponta a ponta (laboratório
 * + cobrança, T-5/T-6): um pedido que nasce e não tem como ser pago nem
 * despachado é uma promessa vazia.
 */
export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  // Ninguém compra exame por outra pessoa a partir da sessão **dela** (091
  // T-7). Quem responde pela criança pede do próprio login, escolhendo-a em
  // "para quem é este exame" — aí o pagamento, o consentimento e o endereço
  // são de quem está pagando, que é como tem de ser.
  if (ehSessaoDeTerceiro(payload)) {
    return corsJson(
      {
        error: "Switch back to your own account to order a test.",
        errorPt: "Volte para a sua conta para pedir um exame.",
        code: "on_behalf_read_only",
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));

  /**
   * De quem é este exame (091 T-3).
   *
   * Nulo é o titular — o que todo pedido feito até aqui quis dizer. Quando vem
   * uma pessoa gerida, **a checagem de dono é feita aqui e não mais adiante**:
   * gravar primeiro e conferir depois deixaria, por um instante, um exame
   * apontando para o filho de outra pessoa.
   *
   * A resposta é 404 e não 403, pela mesma razão da rota de dependentes: não
   * confirma nem desmente que aquele id exista.
   *
   * Isto vem **antes do consentimento** porque o consentimento é do sujeito
   * (091 T-4): quando a mãe pede para a filha, o que vale é o aceite
   * registrado no nome da filha.
   */
  let subjectId: string | null = null;
  let idadeDoSujeito: number | null = null;
  if (body.dependentId) {
    const dep = await prisma.user.findFirst({
      where: { id: String(body.dependentId), managedById: payload.sub, deletedAt: null },
      select: { id: true, dateOfBirth: true },
    });
    if (!dep) {
      return corsJson({ error: "Not found", errorPt: "Não encontrado" }, { status: 404 });
    }
    subjectId = dep.id;
    /**
     * Sem data de nascimento, **recusa** (achado do review de 27/09/2026).
     *
     * Isto calculava `null` e o portão de 16+ abaixo pulava a checagem: "não
     * sei a idade" liberava. Numa regra de saúde é o contrário — quem não tem
     * data não passa. Quem nasce por `criarPessoaGerida` sempre tem uma, mas
     * `subjectId` aceita qualquer `User` com `managedById`, e o schema prevê
     * reatribuição pela clínica.
     */
    if (!dep.dateOfBirth) {
      return corsJson(
        {
          error: "Add a date of birth for this person before ordering a test.",
          errorPt: "Adicione a data de nascimento dessa pessoa antes de pedir um exame.",
          code: "subject_needs_dob",
        },
        { status: 400 }
      );
    }
    idadeDoSujeito = idadeEmAnos(dep.dateOfBirth);
  }

  // O consentimento vem antes de tudo — inclusive de a loja estar aberta. É a
  // declaração sobre o que um exame implica (T-4), e a tela pergunta antes
  // para esta recusa nunca precisar acontecer.
  const consent = await hasLabConsent(subjectId ?? payload.sub);
  if (!consent.accepted) {
    return corsJson(
      { error: "Please read and accept the laboratory test notice before ordering.", errorPt: "Leia e aceite o aviso sobre exames de laboratório antes de pedir.", code: "consent_required" },
      { status: 403 }
    );
  }

  if (!labOrderingEnabled()) {
    return corsJson(
      { error: "Ordering is not open yet.", errorPt: "A compra ainda não está aberta.", code: "ordering_unavailable" },
      { status: 503 }
    );
  }
  if (!payload.clinicId) {
    return corsJson({ error: "No clinic", errorPt: "Sem clínica", code: "no_clinic" }, { status: 403 });
  }

  const items: { productId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return corsJson({ error: "items array is required", errorPt: "Escolha ao menos um exame" }, { status: 400 });
  }
  for (const i of items) {
    const q = Number(i.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 5) {
      return corsJson({ error: "Quantity must be between 1 and 5", errorPt: "A quantidade precisa estar entre 1 e 5" }, { status: 400 });
    }
  }

  const shippingName = String(body.shippingName ?? `${payload.firstName} ${payload.lastName}`).trim().slice(0, 120);
  const shippingAddress = String(body.shippingAddress ?? "").trim().slice(0, 500);
  const shippingPostcode = String(body.shippingPostcode ?? "").trim().toUpperCase().slice(0, 12);
  if (!shippingAddress || !shippingPostcode) {
    return corsJson(
      { error: "The kit goes by post: address and postcode are required.", errorPt: "O kit vai pelo correio: endereço e CEP são obrigatórios.", code: "shipping_required" },
      { status: 400 }
    );
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.labProduct.findMany({ where: { id: { in: productIds }, isActive: true } });
  if (products.length !== new Set(productIds).size) {
    return corsJson({ error: "One or more products not found or inactive", errorPt: "Um dos exames não está disponível" }, { status: 400 });
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  /**
   * Exame de 16+ pedido para uma criança (091 T-3).
   *
   * O Bruno, 27/09: os exames de sangue passam a valer para todas as idades,
   * com responsável quando menor. Isso **não** dissolve a regra que já existia
   * por exame: `notUnder16` está em dez itens do catálogo — hormônios e saúde
   * sexual — e a página do exame já mostra a marca.
   *
   * A checagem mora aqui e não na tela porque a tela é sugestão e o servidor é
   * garantia. Nada impede alguém de montar o pedido por fora.
   */
  if (idadeDoSujeito !== null && idadeDoSujeito < 16) {
    const restrito = products.find((p) => {
      const kit = HOME_KITS.find((k) => k.code === p.lmlProductId);
      return kit?.notUnder16 === true;
    });
    if (restrito) {
      return corsJson(
        {
          error: `${restrito.name} is only available from age 16.`,
          errorPt: `${restrito.name} só está disponível a partir dos 16 anos.`,
          code: "age_restricted",
        },
        { status: 400 }
      );
    }
  }

  const year = new Date().getFullYear();
  const lastOrder = await prisma.labOrder.findFirst({
    where: { orderNumber: { startsWith: `LB-${year}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  const orderNumber = `LB-${year}-${String(seq).padStart(5, "0")}`;

  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const quantity = Math.floor(Number(item.quantity));
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.retailPrice,
      unitCost: product.costPrice ?? 0,
      total: Math.round(product.retailPrice * quantity * 100) / 100,
    };
  });
  const subtotal = Math.round(lineItems.reduce((sum, li) => sum + li.total, 0) * 100) / 100;

  // Quem lê o resultado primeiro, decidido **na compra** (081, corrigido em
  // 26/09/2026): quem já foi atendido tem terapeuta para revisar; quem baixou
  // o app por indicação de um amigo, não — e o resultado é dele.
  const reviewMode = await reviewModeFor(payload.sub, payload.clinicId);

  const order = await prisma.labOrder.create({
    data: {
      orderNumber,
      patientId: payload.sub,
      subjectId,
      clinicId: payload.clinicId,
      reviewMode,
      status: "BASKET",
      subtotal,
      total: subtotal,
      shippingName,
      shippingAddress,
      shippingPostcode,
      items: { create: lineItems },
      events: { create: { status: "BASKET", note: "Order created" } },
    },
    include: patientOrderInclude(),
  });

  return corsJson({ order: patientOrder(order) }, { status: 201 });
}
