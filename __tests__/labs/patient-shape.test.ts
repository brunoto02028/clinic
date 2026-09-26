/**
 * @jest-environment node
 *
 * O que o paciente pode ver (081, T-3) — medido no JSON, não na tela.
 *
 * A rota antiga devolvia o `LabProduct` inteiro, com `costPrice`, para quem
 * quer que chamasse. O custo é a margem da clínica; o app não recebe.
 */

jest.mock("@/lib/db", () => ({ prisma: {} }));

import { patientProduct, patientOrder } from "../../lib/lab-patient";

const produto = {
  id: "p1", lmlProductId: "XTF", name: "Thyroid", category: "Thyroid", description: null,
  biomarkers: ["Free T4", "TSH"], sampleType: "capillary", turnaroundDays: 1, retailPrice: 59, currency: "GBP",
  costPrice: 31.5, isActive: true,
};

describe("patientProduct", () => {
  const out = patientProduct(produto as any);
  it("não devolve custo nem margem", () => {
    const json = JSON.stringify(out).toLowerCase();
    expect(json).not.toContain("costprice");
    expect(json).not.toContain("margin");
    expect(json).not.toContain("31.5");
  });
  it("devolve o preço de venda e a descrição EN/PT da lista quando o banco não tem", () => {
    expect(out.price).toBe(59);
    expect(out.description.en.length).toBeGreaterThan(20);
    expect(out.description.pt.length).toBeGreaterThan(20);
  });
});

describe("patientOrder", () => {
  const pedido = {
    id: "o1", orderNumber: "LB-2026-00001", status: "RESULTS_READY", reviewMode: "THERAPIST", total: 59, currency: "GBP", createdAt: new Date(), paidAt: new Date(),
    shippingName: "QA", shippingAddress: "1 Test St", shippingPostcode: "SW1A 1AA",
    releasedToPatientAt: null, releaseNote: "segredo ainda", releaseNotePt: null,
    items: [{ id: "i1", productId: "p1", productName: "Thyroid", quantity: 1, unitPrice: 59, total: 59, unitCost: 31.5 }],
    registrations: [{ id: "r1", status: "SUCCESS", resultsReady: true, resultsPdfPath: null, assignedPatientAt: new Date(), createdAt: new Date() }],
    events: [
      { id: "e1", status: "RELEASED", createdAt: new Date() },
      { id: "e2", status: "RESULTS_READY", createdAt: new Date() },
    ],
  };
  const out = patientOrder(pedido as any);
  it("resultado chegado e não liberado é 'em revisão', sem nota nem custo no corpo", () => {
    expect(out.stage).toBe("in_review");
    const json = JSON.stringify(out).toLowerCase();
    expect(json).not.toContain("unitcost");
    expect(json).not.toContain("segredo");
    expect(json).not.toContain("releasenote");
  });
  it("eventos internos não saem para o paciente", () => {
    expect(out.events.map((e) => e.status)).toEqual(["RESULTS_READY"]);
  });
  it("o registro do kit é exposto sem o botão até a T-7", () => {
    expect(out.registration).toEqual({ status: "SUCCESS", registered: true, canRegister: false });
  });
});
