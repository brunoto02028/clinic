/**
 * @jest-environment node
 *
 * A pergunta antes da suposição (083).
 *
 * Depois do cadastro o app mandava **todo mundo** para a triagem clínica:
 * quem baixou para comprar um exame de vitamina D era interrogado sobre dor
 * noturna, histórico de câncer e disfunção de bexiga. A bifurcação existe para
 * o app parar de adivinhar o que a pessoa veio fazer.
 *
 * Escolher a clínica é ela dizendo "quero ser atendido" — e é o que a torna
 * paciente. Escolher o exame não escreve nada.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

describe("o cadastro leva à pergunta, não à triagem", () => {
  const reg = ler("mobile", "app", "register.tsx");

  it("o destino de um cadastro de clínica é a bifurcação", () => {
    expect(reg).toContain('"/(app)/welcome-choice"');
  });

  it("e não mais a triagem direta", () => {
    expect(reg).not.toContain('"/(app)/(clinica)/screening"');
  });

  it("aluno de estúdio continua indo ao seletor", () => {
    expect(reg).toContain('criado?.clinicType === "PERSONAL_TRAINER"');
    expect(reg).toContain('"/(app)/module-select"');
  });
});

describe("a rota da escolha", () => {
  const rota = ler("app", "api", "patient", "intent", "route.ts");

  it("só aceita as duas intenções", () => {
    expect(rota).toMatch(/intent !== "lab" && intent !== "clinic"/);
  });

  it("clínica torna paciente; laboratório não escreve nada", () => {
    expect(rota).toMatch(/if \(intent === "clinic"\)/);
    expect(rota).toMatch(/data: \{ isClinicPatient: true \}/);
  });

  it("só promove — nunca rebaixa quem já era paciente", () => {
    expect(rota).toMatch(/isClinicPatient: false/);
    expect(rota).not.toMatch(/isClinicPatient: false \}\s*,?\s*\}\s*\);[\s\S]*data: \{ isClinicPatient: false/);
  });

  it("impersonação não escolhe pela pessoa", () => {
    expect(rota).toMatch(/isImpersonating/);
  });
});

describe("as telas novas", () => {
  it("a bifurcação oferece as três portas, nas duas línguas", () => {
    const tela = ler("mobile", "app", "(app)", "welcome-choice.tsx");
    for (const id of ["choice-lab", "choice-book", "choice-patient"]) expect(tela).toContain(id);
    expect(tela).toContain('pt: "Quero fazer um exame de sangue"');
    expect(tela).toContain('pt: "Já sou paciente da BPR"');
  });

  it("a escolha invalida a lista de áreas — senão a guarda manda de volta", () => {
    expect(ler("mobile", "app", "(app)", "welcome-choice.tsx")).toMatch(/invalidateQueries\(\{ queryKey: \["modules"\] \}\)/);
  });

  it("o perfil pede os quatro campos do laboratório, cada um com o porquê", () => {
    const tela = ler("mobile", "app", "(app)", "profile-setup.tsx");
    for (const id of ["setup-dob", "setup-phone", "setup-address", "setup-postcode"]) {
      expect(tela).toContain(id);
    }
    // Os dois botões de sexo saem de um `map`, então o testID é montado:
    expect(tela).toContain("`setup-sex-${v}`");
    expect(tela).toContain("faixas de referência");
    expect(tela).toContain("setup-skip");
  });

  it("o servidor aceita o sexo biológico, que a faixa de referência exige", () => {
    expect(ler("app", "api", "patient", "profile", "route.ts")).toMatch(/'dateOfBirth', 'sex'/);
  });

  it("o menu do laboratório não oferece o que é da clínica", () => {
    const menu = ler("mobile", "app", "(app)", "(lab)", "(tabs)", "profile.tsx");
    for (const proibido of ["clinical-notes", "exercises", "messages", "treatment-protocol"]) {
      expect(menu).not.toContain(proibido);
    }
    expect(menu).toContain("Meus pedidos");
  });
});
