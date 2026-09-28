/**
 * @jest-environment node
 *
 * A posição do pedido na tela do paciente (081, T-3): três máquinas de estado
 * viram uma, com oito posições, e o paciente só age em uma delas.
 */

import { labStage, stageNeedsPatient, stageCopy, STAGE_ORDER } from "../../lib/lab-stage";

const pedido = (status: any, extra: Partial<Parameters<typeof labStage>[0]> = {}) => ({
  status,
  releasedToPatientAt: null,
  registrations: [],
  ...extra,
});

describe("labStage", () => {
  it("o kit despachado sem dono pede registro — o único momento de agir", () => {
    expect(labStage(pedido("KIT_DISPATCHED"))).toBe("register_kit");
    expect(labStage(pedido("KIT_DISPATCHED", { registrations: [{ status: "AWAITING_PATIENT" }] }))).toBe("register_kit");
    expect(stageNeedsPatient("register_kit")).toBe(true);
  });
  it("registrado, é coletar e postar", () => {
    expect(labStage(pedido("KIT_DISPATCHED", { registrations: [{ status: "PENDING" }] }))).toBe("collect_and_post");
  });
  it("resultado que chega é resultado liberado — não há mais revisão", () => {
    // Era `in_review` para quem tinha relação clínica. Acabou em 26/09/2026: o
    // resultado é da pessoa, e os termos publicados dizem isso. Nem um pedido
    // antigo gravado como THERAPIST segura mais nada.
    expect(labStage(pedido("RESULTS_READY"))).toBe("released");
    expect(labStage(pedido("RESULTS_READY", { reviewMode: "THERAPIST" }))).toBe("released");
    expect(labStage(pedido("RESULTS_READY", { releasedToPatientAt: new Date() }))).toBe("released");
    // O estágio sobrevive no tipo para pedidos antigos, e continua sem pedir
    // nada da pessoa.
    expect(stageNeedsPatient("in_review")).toBe(false);
  });
  it("cancelado vence tudo, inclusive um liberado", () => {
    expect(labStage(pedido("CANCELLED_LAB", { releasedToPatientAt: new Date() }))).toBe("cancelled");
  });
  it("os demais estados mapeiam sem buraco", () => {
    expect(labStage(pedido("BASKET"))).toBe("basket");
    expect(labStage(pedido("CONFIRMED"))).toBe("kit_preparing");
    expect(labStage(pedido("SAMPLE_RECEIVED"))).toBe("at_lab");
    expect(labStage(pedido("PROCESSING_LAB"))).toBe("at_lab");
  });
});

describe("stageCopy", () => {
  it("todo estágio tem título e corpo em EN e PT", () => {
    for (const s of [...STAGE_ORDER, "basket", "cancelled"] as const) {
      const c = stageCopy(s, 2);
      expect(c.en.title.length).toBeGreaterThan(3);
      expect(c.pt.title.length).toBeGreaterThan(3);
      expect(c.en.body.length).toBeGreaterThan(10);
      expect(c.pt.body.length).toBeGreaterThan(10);
    }
  });
  it("o prazo prometido aparece escrito na revisão, com singular e plural", () => {
    expect(stageCopy("in_review", 1).en.body).toContain("up to 1 working day.");
    expect(stageCopy("in_review", 3).en.body).toContain("up to 3 working days");
    expect(stageCopy("in_review", 1).pt.body).toContain("até 1 dia útil");
    expect(stageCopy("in_review", 3).pt.body).toContain("até 3 dias úteis");
  });
  it("nenhum texto do paciente fala em custo ou margem", () => {
    for (const s of [...STAGE_ORDER, "basket", "cancelled"] as const) {
      const c = stageCopy(s, 2);
      for (const txt of [c.en.title, c.en.body, c.pt.title, c.pt.body]) {
        expect(txt.toLowerCase()).not.toMatch(/margin|margem|cost price|custo/);
      }
    }
  });
});
