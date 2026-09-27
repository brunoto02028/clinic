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

describe("o que o QA da 095 achou, e foi consertado", () => {
  const aderencia = lerCodigo("lib", "clinic-daily-adherence.ts");

  it("**o avulso nasce com dose** (5.4)", () => {
    /**
     * Ele nascia sem série, sem repetição, sem frequência e sem observação — e
     * o diálogo dizia o contrário, *"with its own default sets and reps"*.
     *
     * Duas perdas na mesma linha: o padrão do exercício só era aplicado no ramo
     * da pasta, e `frequency`/`notes` chegavam no **topo** do corpo enquanto
     * aqui só se lia por item.
     *
     * Pior que o campo vazio: painel e paciente discordavam do mesmo
     * exercício. O painel dizia "No sets/reps set" e a tela do paciente, que
     * cai no padrão, mostrava 3×12 — dose que ninguém escolheu.
     */
    expect(rotaAdmin).toMatch(/sets: ex\.sets \?\? padrao\.get\(ex\.exerciseId\)\?\.defaultSets/);
    expect(rotaAdmin).toMatch(/frequency: ex\.frequency \|\| frequency \|\| null/);
    expect(rotaAdmin).toMatch(/notes: ex\.notes \|\| notes \|\| null/);
  });

  it("e a dose padrão não pode derrubar a prescrição", () => {
    // `?? []`: sem a lista, cada exercício entra com o que veio no pedido e o
    // resto fica nulo — o comportamento de antes, em vez de um 500.
    expect(rotaAdmin).toMatch(/\)\) \?\? \[\]/);
  });

  it("o diálogo do avulso existe no caso comum, não só no vazio", () => {
    // Uma edição minha deixou duas cópias no ramo do estado vazio e **nenhuma**
    // no principal: o botão aparecia para todo paciente que já tem exercício e
    // não abria nada.
    expect((aba.match(/\{umPicker\}/g) || []).length).toBe(2);
  });

  it("e o paciente só-avulso aparece no card de aderência", () => {
    // O filtro pedia plano enviado, e só. Desde que dá para prescrever um
    // exercício sozinho, existe paciente que faz exercício todo dia e nunca
    // aparecia — é a forma de paciente que esta tarefa passou a produzir.
    expect(aderencia).toMatch(/receivedExercises: \{ some: \{ isActive: true \} \}/);
  });
});
