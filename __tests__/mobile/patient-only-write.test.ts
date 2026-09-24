/**
 * @jest-environment node
 *
 * O gate de paciente deixa passar quem não é paciente de propósito — rotas que
 * o admin e o portal dividem quebrariam se ele recusasse. Mas há rotas que
 * ninguém divide, e nelas herdar a passagem livre é errado.
 *
 * O QA de 24/09/2026 pegou o caso: uma conta de terapeuta gravava foto de
 * perfil por uma rota `/api/patient/`. É uma linha de decisão, e é o tipo de
 * linha que alguém inverte um dia achando que a equipe também deveria poder.
 */

import { patientOnlyWriteRefusal } from "../../lib/patient-only-write";

describe("patientOnlyWriteRefusal", () => {
  it("o paciente escreve", () => {
    expect(patientOnlyWriteRefusal({ role: "PATIENT" })).toBeNull();
  });

  it("terapeuta, admin e superadmin não escrevem aqui", () => {
    for (const role of ["THERAPIST", "ADMIN", "SUPERADMIN", "NUTRITIONIST"]) {
      expect(patientOnlyWriteRefusal({ role })).toBe("not_patient");
    }
  });

  it("impersonação é leitura, mesmo com o papel do paciente", () => {
    // Um admin vendo o portal carrega `role: PATIENT`, e sem esta ordem
    // passaria direto pela checagem de papel.
    expect(patientOnlyWriteRefusal({ role: "PATIENT", isImpersonating: true })).toBe("impersonation");
  });

  it("papel ausente não escreve por acidente", () => {
    // Lista de quem pode, não de quem não pode: um papel novo nasce sem
    // acesso, que é o lado certo do erro.
    expect(patientOnlyWriteRefusal({})).toBe("not_patient");
    expect(patientOnlyWriteRefusal(null)).toBe("not_patient");
    expect(patientOnlyWriteRefusal(undefined)).toBe("not_patient");
    expect(patientOnlyWriteRefusal({ role: "patient" })).toBe("not_patient");
  });
});
