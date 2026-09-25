/**
 * @jest-environment node
 *
 * O app é do paciente. Uma conta da clínica entrava, via a lista de módulos, e
 * então cada tela recusava com 403 sem nenhuma saída — a credencial estava
 * certa, o lugar é que era errado. Aconteceu em produção, 24/09/2026.
 *
 * A regra é de uma linha, e é exatamente o tipo de linha que alguém "melhora"
 * um dia achando que terapeuta também deveria entrar. Fica presa aqui, com o
 * porquê.
 */

import { canUsePatientApp, PATIENT_ONLY_MESSAGE, patientOnlyRefusal } from "@/lib/mobile-patient-only";

describe("canUsePatientApp", () => {
  it("paciente entra", () => {
    expect(canUsePatientApp("PATIENT")).toBe(true);
  });

  it("aluno de estúdio é paciente e entra — o app dele é este", () => {
    // Um aluno de personal trainer tem `role: PATIENT` num tenant
    // PERSONAL_TRAINER. Quem é recusado é o profissional, não o aluno.
    expect(canUsePatientApp("PATIENT")).toBe(true);
  });

  it("terapeuta, admin e superadmin são recusados", () => {
    expect(canUsePatientApp("THERAPIST")).toBe(false);
    expect(canUsePatientApp("ADMIN")).toBe(false);
    expect(canUsePatientApp("SUPERADMIN")).toBe(false);
  });

  it("papel ausente ou desconhecido não entra por acidente", () => {
    // A regra é uma lista de quem pode, não de quem não pode: um papel novo
    // criado amanhã nasce sem acesso ao app, que é o lado certo do erro.
    expect(canUsePatientApp(null)).toBe(false);
    expect(canUsePatientApp(undefined)).toBe(false);
    expect(canUsePatientApp("")).toBe(false);
    expect(canUsePatientApp("NUTRITIONIST")).toBe(false);
    expect(canUsePatientApp("patient")).toBe(false); // minúsculo não é o enum
  });
});

describe("patientOnlyRefusal", () => {
  it("diz o que fazer, nos dois idiomas, e carrega um código", () => {
    const r = patientOnlyRefusal();
    expect(r.code).toBe("patient_app_only");
    expect(r.error).toBe(PATIENT_ONLY_MESSAGE.en);
    expect(r.errorPt).toBe(PATIENT_ONLY_MESSAGE.pt);
    // A frase precisa dizer para onde ir — "acesso negado" deixaria a pessoa
    // achando que a senha está errada.
    expect(r.error).toMatch(/bpr\.clinic/);
    expect(r.errorPt).toMatch(/bpr\.clinic/);
  });
});
