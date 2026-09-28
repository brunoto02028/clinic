/**
 * @jest-environment node
 *
 * "Para quem este plano vale?" (082, T-3).
 *
 * O servidor já respondia certo — `patientScope: "all"` mais os `"specific"`
 * deste paciente, e `subscribe` recusa um plano que não foi oferecido a ele
 * (atividade 52, T-6). O que faltava era a porta: o único consumidor dessa API
 * vivia no módulo BA, então o paciente da clínica não tinha onde ver nem
 * assinar um plano feito para ele.
 *
 * O que fica preso aqui é o filtro do servidor e a existência da tela.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

describe("o servidor só oferece o que é deste paciente", () => {
  const rota = ler("app", "api", "patient", "membership", "plans", "route.ts");

  it("filtra por escopo: todos, ou específico dele", () => {
    expect(rota).toMatch(/patientScope: "all"/);
    expect(rota).toMatch(/patientScope: "specific", patientId: userId/);
  });

  it("e só planos ativos da clínica dele", () => {
    expect(rota).toMatch(/status: "ACTIVE"/);
    expect(rota).toMatch(/clinicId \? \{ clinicId \} : \{\}/);
  });

  it("assinar confere o mesmo escopo — id sozinho não basta", () => {
    const sub = ler("app", "api", "patient", "membership", "subscribe", "route.ts");
    expect(sub).toMatch(/plan\.patientScope === "all"/);
    expect(sub).toMatch(/plan\.patientScope === "specific" && plan\.patientId === userId/);
    expect(sub).toMatch(/plan\.clinicId !== clinicId/);
  });
});

describe("a porta existe no app da clínica", () => {
  it("a tela consome a API de planos e a de assinatura", () => {
    const tela = ler("mobile", "app", "(app)", "(clinica)", "plans.tsx");
    expect(tela).toMatch(/fetchPlans/);
    expect(tela).toMatch(/subscribeToPlan/);
    expect(tela).toMatch(/cancelSubscription/);
  });

  it("o menu da clínica leva até ela", () => {
    const menu = ler("mobile", "app", "(app)", "(clinica)", "(tabs)", "profile.tsx");
    expect(menu).toMatch(/href: "\/\(app\)\/\(clinica\)\/plans"/);
    expect(menu).toMatch(/en: "Plans", pt: "Planos"/);
  });

  it("a tela fala as duas línguas", () => {
    const tela = ler("mobile", "app", "(app)", "(clinica)", "plans.tsx");
    const semTraducao = tela.match(/tr\(lang, \{ en: "[^"]*" \}\)/g);
    expect(semTraducao).toBeNull();
    expect(tela).toMatch(/pt: "Cancelar plano"/);
  });
});
