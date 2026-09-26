/**
 * @jest-environment node
 *
 * De quem é a área da clínica (083, 26/09/2026).
 *
 * O app deixou de ser só o app dos pacientes: alguém indicado por um amigo
 * baixa, se cadastra e compra um exame de laboratório sem nunca ter sido
 * atendido. Mostrar a essa pessoa prontuário, exercícios e mensagens de uma
 * clínica que nunca a viu é oferecer a casa de outra pessoa.
 *
 * Antes, `keys.add("clinica")` era incondicional — todo cadastro ganhava a
 * clínica. O que fica preso aqui é a regra nova, e o caminho de volta: o
 * primeiro ato clínico promove.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

describe("a rota de módulos", () => {
  const rota = ler("app", "api", "mobile", "modules", "route.ts");

  it("lê o flag do usuário", () => {
    expect(rota).toMatch(/isClinicPatient: true/);
  });

  it("a clínica é concedida a quem é paciente, ou a quem a clínica concedeu à mão", () => {
    expect(rota).toMatch(
      /const clinicaConcedida = overrideGrants\(overrides\["mod_clinica"\]\) === true \|\| user\?\.isClinicPatient === true;/
    );
    expect(rota).toMatch(/if \(!clinicaDenied && clinicaConcedida\) \{\s+keys\.add\("clinica"\);/);
  });

  it("o laboratório não depende mais de ser paciente da clínica", () => {
    // Era `labOn && !clinicaDenied && …`: quem não tinha a clínica perdia o
    // laboratório junto, que é exatamente o contrário do produto.
    expect(rota).toMatch(/if \(labOn && overrideGrants\(overrides\["mod_lab"\]\) !== false\)/);
  });
});

describe("virar paciente", () => {
  it("a conta criada pela clínica já nasce paciente", () => {
    expect(ler("app", "api", "admin", "patients", "route.ts")).toMatch(/isClinicPatient: true/);
  });

  it("marcar consulta promove quem comprou só um exame", () => {
    const rota = ler("app", "api", "appointments", "route.ts");
    expect(rota).toMatch(/markAsClinicPatient\(patientId, actor\.clinicId\)/);
  });

  it("a promoção só vai de false para true", () => {
    const lib = ler("lib", "lab-review-mode.ts");
    expect(lib).toMatch(/where: \{ id: patientId, clinicId, role: "PATIENT", isClinicPatient: false \}/);
    expect(lib).toMatch(/data: \{ isClinicPatient: true \}/);
  });
});

describe("o backfill de quem já era paciente", () => {
  const script = ler("scripts", "backfill-clinic-patient-flag.js");

  it("olha para o que a clínica já fez pela pessoa", () => {
    for (const sinal of ["patientAppointments", "packagesAsPatient", "medicalScreening", "receivedExercises", "soapNotesFor"]) {
      expect(script).toContain(sinal);
    }
  });

  it("comprar exame de laboratório NÃO conta — é o ato que não faz ninguém paciente", () => {
    expect(script).not.toMatch(/labOrder/);
  });

  it("só vai de false para true", () => {
    expect(script).toMatch(/isClinicPatient: false/);
    expect(script).toMatch(/data: \{ isClinicPatient: true \}/);
  });

  it("a imagem carrega o script, senão o deploy reprova na própria guarda", () => {
    expect(ler("Dockerfile")).toContain("scripts/backfill-clinic-patient-flag.js");
    expect(ler("start.sh")).toContain("backfill-clinic-patient-flag.js");
  });
});
