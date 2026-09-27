import { lerCodigo } from "../helpers/codigo";

/**
 * Mandar **um** exercício, e não a pasta inteira (095 T-5, 27/09/2026).
 *
 * Pedido do Bruno: *"A forma como os exercícios aparecem para o paciente, quero
 * poder enviar exercícios individuais e não a pasta toda."*
 *
 * ## O modelo já sabia; faltava o botão
 *
 * `ExercisePrescription` é **uma linha por exercício**, e a rota já aceitava
 * `exercises: [...]`. O que o painel oferecia era só "prescrever a pasta" — e
 * foi assim que o card de aderência dele passou a cobrar dez exercícios por
 * dia, *"Missing 10 activities today"*, Advanced Core 001 a 010.
 *
 * ## E a pasta é nome da clínica
 *
 * A biblioteca é organizada para quem atende: por região do corpo, por lote de
 * importação. O programa de uma pessoa raramente cai nesse recorte, e o nome
 * da estante não é assunto dela.
 */

const rotaPaciente = lerCodigo("app", "api", "exercises", "route.ts");
const aba = lerCodigo("components", "admin", "patient-exercises-tab.tsx");
const rotaAdmin = lerCodigo("app", "api", "admin", "exercise-prescriptions", "route.ts");

describe("o painel manda um só", () => {
  it("existe a ação, ao lado da pasta", () => {
    expect(aba).toContain("const prescreverUm = async ()");
    expect(aba).toMatch(/Add one/);
    // A pasta continua: quem manda um programa inteiro continua mandando.
    expect(aba).toMatch(/Add folder/);
  });

  it("e ela manda uma lista de um, que a API já entende", () => {
    expect(aba).toMatch(/exercises: \[\{ exerciseId: escolhido\.id \}\]/);
  });

  it("sem plano pendurado, para um plano arquivado não levá-lo junto", () => {
    // `protocolId` nulo é o que separa "prescrito sozinho" de "veio de um
    // plano" — e é o que a rota faz quando recebe `exercises`.
    const acao = aba.slice(aba.indexOf("const prescreverUm"), aba.indexOf("const prescribeFolder"));
    expect(acao).not.toMatch(/protocolId/);
    expect(rotaAdmin).toMatch(/protocolId/);
  });

  it("e a busca mostra a pasta a quem prescreve — não ao paciente", () => {
    expect(aba).toMatch(/e\.folder\?\.name &&/);
  });
});

describe("o paciente não vê nome de pasta da clínica", () => {
  it("a rota dele deixou de mandar a pasta", () => {
    expect(rotaPaciente).not.toMatch(/folder: \{ select: \{ id: true, name: true \} \}/);
  });

  it("e manda o grupo da prescrição dele, que pode ser nenhum", () => {
    expect(rotaPaciente).toMatch(/grupo: p\.displayGroup \?\? null/);
  });
});
