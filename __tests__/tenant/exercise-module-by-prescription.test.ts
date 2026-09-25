/**
 * @jest-environment node
 *
 * Prescrever é conceder.
 *
 * `mod_exercises` só era liberado por pacote pago, plano ou override — nunca
 * pelo ato clínico. O terapeuta prescrevia um exercício e o app do paciente
 * continuava dizendo "não está incluído no seu plano", porque ele não tinha
 * comprado nada. A porta dependia da venda, não do cuidado.
 */

import { computePatientAccess, type PatientAccessInput } from "@/lib/patient-access";

const paciente = (over: Partial<PatientAccessInput> = {}): PatientAccessInput => ({
  role: "PATIENT",
  consentAcceptedAt: new Date(),
  medicalScreening: { isSubmitted: true },
  patientSubscriptions: [],
  packagesAsPatient: [],
  receivedExercises: [],
  moduleOverrides: {},
  clinic: { type: "CLINIC" },
  ...over,
});

describe("computePatientAccess — exercícios por prescrição", () => {
  it("sem pacote, sem plano e sem prescrição: não tem o módulo", () => {
    const a = computePatientAccess(paciente());
    expect(a.modules).not.toContain("mod_exercises");
  });

  it("uma prescrição ativa basta", () => {
    const a = computePatientAccess(paciente({ receivedExercises: [{ id: "p1" }] }));
    expect(a.modules).toContain("mod_exercises");
    expect(a.reasons["mod_exercises"]).toBe("prescription");
  });

  it("libera exercícios e **nada além** — a concessão é do tamanho do ato", () => {
    const sem = computePatientAccess(paciente());
    const com = computePatientAccess(paciente({ receivedExercises: [{ id: "p1" }] }));

    const diferenca = com.modules.filter((m) => !sem.modules.includes(m));
    expect(diferenca).toEqual(["mod_exercises"]);
  });

  it("override `hidden` vence a prescrição", () => {
    const a = computePatientAccess(
      paciente({ receivedExercises: [{ id: "p1" }], moduleOverrides: { mod_exercises: "hidden" } })
    );
    expect(a.modules).not.toContain("mod_exercises");
    expect(a.hiddenModules).toContain("mod_exercises");
  });

  it("prescrição não mexe em quem já tinha por tratamento", () => {
    const a = computePatientAccess(
      paciente({ packagesAsPatient: [{ id: "pac1" }], receivedExercises: [{ id: "p1" }] })
    );
    expect(a.modules).toContain("mod_exercises");
    // O primeiro motivo vence, e o tratamento é lido antes de qualquer override
    expect(["treatment", "prescription"]).toContain(a.reasons["mod_exercises"]);
  });
});
