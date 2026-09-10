/**
 * @jest-environment node
 *
 * A personal-trainer studio must not read as a clinic: the vocabulary layer
 * rewrites the clinical terms in an already-localized label, and leaves a
 * clinic tenant's text untouched.
 */

import { personalizeLabel } from "@/lib/tenant-vocab";

const en = (t: string) => personalizeLabel(t, { isPersonal: true, isPt: false });
const pt = (t: string) => personalizeLabel(t, { isPersonal: true, isPt: true });

describe("personalizeLabel", () => {
  it("rewrites the English clinical terms", () => {
    expect(en("Patients")).toBe("Students");
    expect(en("Patient")).toBe("Student");
    expect(en("Treatments")).toBe("Workouts");
    expect(en("Clinical")).toBe("Training");
    expect(en("Clinic")).toBe("Studio");
    expect(en("Therapists")).toBe("Trainers");
    expect(en("Appointment")).toBe("Session");
    expect(en("Active clinicians")).toBe("Active trainers");
    expect(en("Screening")).toBe("Readiness");
  });

  it("rewrites the Portuguese clinical terms", () => {
    expect(pt("Pacientes")).toBe("Alunos");
    expect(pt("Paciente")).toBe("Aluno");
    expect(pt("Tratamento")).toBe("Treino");
    expect(pt("Clínica")).toBe("Estúdio");
    expect(pt("Fisioterapeuta")).toBe("Personal");
    expect(pt("Consulta")).toBe("Sessão");
    expect(pt("Triagem")).toBe("Prontidão");
  });

  it("only touches whole words", () => {
    // "Clinical" must not be mangled by the "Clinic" rule.
    expect(en("Clinical notes")).toBe("Training notes");
  });

  it("leaves a clinic tenant's text unchanged", () => {
    expect(personalizeLabel("Patients", { isPersonal: false, isPt: false })).toBe("Patients");
    expect(personalizeLabel("Pacientes", { isPersonal: false, isPt: true })).toBe("Pacientes");
  });
});
