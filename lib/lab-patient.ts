import { prisma } from "@/lib/db";
import { HOME_KITS } from "@/lib/lab-catalog";
import { labStage } from "@/lib/lab-stage";
import { nonDiagnosticCopy } from "@/lib/lab-review-mode";
import { idadeEmAnos } from "@/lib/managed-patients";

/**
 * O que o paciente pode ver (081, T-3) — e, tão importante, o que não pode.
 *
 * Nenhuma função aqui devolve `costPrice`: a margem é assunto da clínica. E o
 * resultado só sai daqui **depois de liberado**; antes disso não há valores,
 * nem "em breve" que sugira que já existem. A tela do paciente diz "em revisão
 * com o seu terapeuta", e é só.
 */

const porCodigo = new Map(HOME_KITS.map((k) => [k.code, k]));

export function patientProduct(p: {
  id: string; lmlProductId: string; name: string; category: string | null; description: string | null;
  biomarkers: string[]; sampleType: string | null; turnaroundDays: number | null; retailPrice: number; currency: string;
}) {
  const kit = porCodigo.get(p.lmlProductId);
  return {
    id: p.id,
    code: p.lmlProductId,
    name: p.name,
    category: p.category,
    biomarkers: p.biomarkers,
    /**
     * `null` quando não se sabe — e **não** `"capillary"`, que era o que estava
     * aqui.
     *
     * Os 421 exames da planilha de 2026 entram sem método de coleta: a planilha
     * não traz essa coluna, e quem a sabe é a API deles (`appointment_only` e os
     * métodos de entrega). Com o default anterior, cada um deles chegava ao app
     * declarado como **picada no dedo em casa** — incluindo cariótipo e painel
     * NGS, que são punção venosa. A tela então prometia um envelope pelo correio
     * a quem teria de ir a um ponto de coleta.
     *
     * É o mesmo defeito que a varredura de 26/09 encontrou, re-armado por um
     * `??` que parecia inofensivo. Um default que inventa um fato é pior que a
     * ausência dele: a ausência a tela sabe tratar.
     */
    sampleType: p.sampleType ?? kit?.sampleType ?? null,
    turnaroundDays: p.turnaroundDays ?? kit?.turnaroundDays ?? null,
    price: p.retailPrice,
    currency: p.currency,
    // A descrição do banco, quando a clínica escreveu uma; senão a da lista,
    // em inglês primeiro e português junto.
    description: { en: p.description ?? kit?.descriptionEn ?? "", pt: kit?.descriptionPt ?? p.description ?? "" },
    notUnder16: kit?.notUnder16 ?? false,
  };
}

export function patientOrderInclude() {
  return {
    items: { select: { id: true, productId: true, productName: true, quantity: true, unitPrice: true, total: true } },
    registrations: { select: { id: true, status: true, resultsReady: true, resultsPdfPath: true, assignedPatientAt: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
    events: { select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" as const } },
    // De quem é o exame (091 T-3). Nulo significa o próprio titular.
    subject: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
  };
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadPatientOrder>>>;

export async function loadPatientOrder(id: string, patientId: string) {
  return prisma.labOrder.findFirst({ where: { id, patientId }, include: patientOrderInclude() });
}

/**
 * Este pedido precisa que um profissional colha o sangue num ponto? (091 T-1)
 *
 * O Bruno, 27/09: *"só pode encontrar o ponto de coleta depois de pagar.
 * Porque a pessoa compra o exame, depois ela vai para as telas seguintes."*
 * Procurar ponto deixou de ser coisa da vitrine e passou a ser coisa do
 * pedido — e o pedido tem de saber se precisa de um.
 *
 * **Hoje isto é `false` para tudo, e é a verdade**: os 22 exames do catálogo
 * são `capillary`, picada no dedo em casa. A pergunta é feita ao dado e não
 * fixada em código para que, no dia em que entrar um exame venoso, a tela
 * passe a oferecer o ponto sozinha.
 */
export async function precisaDePontoDeColeta(o: OrderRow): Promise<boolean> {
  const ids = [...new Set(o.items.map((i) => i.productId))];
  if (ids.length === 0) return false;
  const produtos = await prisma.labProduct.findMany({
    where: { id: { in: ids } },
    select: { sampleType: true },
  });
  return produtos.some((p) => (p.sampleType ?? "").toLowerCase().includes("venous"));
}

/**
 * Quem a LML precisa saber que é (091 T-3).
 *
 * **Esta é a função que separa "de quem é a conta" de "de quem é o sangue".**
 * O laboratório analisa uma amostra e emite um laudo com faixa de referência
 * por idade: mandar o nome e a data de nascimento do pai para a amostra da
 * filha produz um laudo errado com a aparência de certo — o pior defeito
 * possível neste módulo.
 *
 * Hoje **ninguém chama `placeOrder`**: a integração espera o token (081, T-5 a
 * T-9). Esta função existe agora para que, no dia em que alguém a ligar, o
 * caminho certo já esteja escrito e o errado exija trabalho. Quem for wiring
 * isso: é daqui que sai a identidade, nunca de `order.patient`.
 */
export async function identidadeParaOLaboratorio(
  orderId: string
): Promise<{ firstName: string; lastName: string; dateOfBirth: Date | null; ehGerido: boolean } | null> {
  const o = await prisma.labOrder.findUnique({
    where: { id: orderId },
    select: {
      subject: { select: { firstName: true, lastName: true, dateOfBirth: true } },
      patient: { select: { firstName: true, lastName: true, dateOfBirth: true } },
    },
  });
  if (!o) return null;

  if (o.subject) {
    return { ...o.subject, ehGerido: true };
  }
  return {
    firstName: o.patient.firstName,
    lastName: o.patient.lastName,
    dateOfBirth: o.patient.dateOfBirth,
    ehGerido: false,
  };
}

export function patientOrder(o: OrderRow) {
  const stage = labStage(o);
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    stage,
    total: o.total,
    currency: o.currency,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    // Lista explícita, não `o.items` inteiro: o `select` da consulta já exclui
    // o custo, mas quem chamar isto com uma linha completa não pode vazá-lo.
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    shipping: { name: o.shippingName, address: o.shippingAddress, postcode: o.shippingPostcode },
    registration: o.registrations[0]
      ? { status: o.registrations[0].status, registered: !!o.registrations[0].assignedPatientAt, canRegister: false }
      : null,
    /**
     * De quem é este exame (091 T-3).
     *
     * `null` é o próprio titular — o sentido de todo pedido feito antes disto.
     * Quando há dependente, o nome dele é o que a tela precisa mostrar: um
     * resultado que aparece sem dizer de quem é, numa conta que pede exame
     * para mais de uma pessoa, é um resultado pronto para ser lido errado.
     */
    subject: o.subject
      ? {
          id: o.subject.id,
          firstName: o.subject.firstName,
          lastName: o.subject.lastName,
          dateOfBirth: o.subject.dateOfBirth,
          // `dateOfBirth` é opcional em `User`. Uma pessoa gerida sempre tem a
          // sua — a validação exige —, mas o tipo não promete isso, e inventar
          // uma idade a partir de nulo seria pior do que não mostrar nenhuma.
          idade: o.subject.dateOfBirth ? idadeEmAnos(o.subject.dateOfBirth) : null,
        }
      : null,
    released: !!o.releasedToPatientAt,
    releasedAt: o.releasedToPatientAt,
    reviewMode: o.reviewMode,
    // Eventos internos (RELEASED, erros) não são do paciente; só o ciclo do kit.
    events: o.events.filter((e) => ["CONFIRMED", "KIT_DISPATCHED", "SAMPLE_RECEIVED", "PROCESSING_LAB", "RESULTS_READY", "CANCELLED_LAB"].includes(e.status)),
  };
}

/** O resultado, e só quando liberado. Antes disso a função devolve `null`. */
export async function patientResult(o: OrderRow) {
  // O resultado é da pessoa assim que chega — não há mais liberação pela
  // clínica (26/09/2026). `releasedToPatientAt` segue valendo para os pedidos
  // que já o tinham gravado.
  const liberado = o.status === "RESULTS_READY" || !!o.releasedToPatientAt;
  if (!liberado) return null;
  const values = await prisma.labResultValue.findMany({
    where: { registration: { orderId: o.id } },
    select: { id: true, biomarker: true, value: true, valueText: true, unit: true, minRange: true, maxRange: true, outOfRange: true, measuredAt: true },
    orderBy: { biomarker: "asc" },
  });
  return {
    reviewMode: o.reviewMode,
    releasedAt: o.releasedToPatientAt,
    noteEn: o.releaseNote ?? "",
    notePt: o.releaseNotePt ?? "",
    values,
    pdfAvailable: o.registrations.some((r) => !!r.resultsPdfPath),
    nonDiagnostic: nonDiagnosticCopy(),
  };
}
