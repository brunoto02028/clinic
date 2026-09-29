/**
 * @jest-environment node
 *
 * O paciente consegue marcar (29/09/2026).
 *
 * O Bruno, no aplicativo: *"o botão confirm booking não tem ação nenhuma… não
 * funciona com nenhuma opção, tá? Nem porque a hora que clica lá ou em casa,
 * por vídeo, ou na clínica."*
 *
 * Não era o formato. Eram **duas travas com a mesma causa**, uma de cada lado:
 *
 * - a tela desabilitava o botão por `!type`;
 * - o servidor respondia 400 sem `treatmentType`.
 *
 * E esta clínica não cadastra tipo de tratamento nenhum — o Bruno: *"os tipos
 * de tratamento da clinic só crio personalizado depois de atender o
 * paciente."* A própria tela já sabia disso e sumia com a seção, com um
 * comentário dizendo que *"a consulta é marcada do mesmo jeito, e o servidor
 * põe o rótulo"*. O servidor é que não tinha sido avisado.
 *
 * Nenhum paciente desta clínica conseguia marcar consulta. Por nenhum caminho.
 */
import { lerCodigo } from "../helpers/codigo";

const rota = lerCodigo("app", "api", "appointments", "route.ts");
const tela = lerCodigo("mobile", "app", "(app)", "(clinica)", "book-appointment.tsx");
const api = lerCodigo("mobile", "src", "api", "booking.ts");

describe("o servidor aceita marcar sem tipo de tratamento", () => {
  it("**a entrada exige data, e não mais o tipo**", () => {
    expect(rota).toMatch(/if \(!dateTime\) \{/);
    expect(rota).not.toMatch(/if \(!dateTime \|\| !treatmentType\)/);
  });

  it("e mesmo assim nenhuma consulta nasce sem rótulo", () => {
    // O campo é obrigatório no banco; gravar vazio deixaria a consulta sem
    // nome na lista do paciente.
    expect(rota).toMatch(/"Initial Consultation"/);
    expect(rota).toMatch(/"Treatment Session"/);
    expect(rota).toMatch(/treatmentType \|\| "Consultation"/);
  });

  it("o tipo escolhido, quando existe, continua valendo", () => {
    // E continua sendo validado contra o catálogo da clínica: string
    // arbitrária no corpo não vira tipo de tratamento.
    expect(rota).toMatch(/tipoEscolhido \?\? \(opcao\.kind === "FIRST_CONSULTATION"/);
    expect(rota).toMatch(/prisma\.treatmentType\.findFirst/);
  });
});

describe("a tela não exige o que ela mesma não oferece", () => {
  it("**o botão só pede o tipo quando há tipo para escolher**", () => {
    expect(tela).toMatch(/disabled=\{\(temTipos && !type\) \|\| !selectedDate \|\| !selectedTime\}/);
  });

  it("a seção de tipos e o botão olham a mesma coisa", () => {
    // Era a contradição: a seção sumia por `length > 0` e o botão exigia
    // `type`, trezentas linhas adiante. Agora as duas leem `temTipos`.
    expect(tela).toMatch(/const temTipos = \(tipos\.data \?\? \[\]\)\.length > 0;/);
    expect(tela).toMatch(/\{temTipos && \(/);
  });

  it("a mutação não barra mais por falta de tipo", () => {
    expect(tela).toMatch(/if \(!selectedDate \|\| !selectedTime\) throw/);
  });

  it("e o tipo da requisição deixou de exigi-lo", () => {
    expect(api).toMatch(/treatmentType\?: string;/);
  });

  it("data e hora continuam obrigatórias", () => {
    // O botão continua parado quando falta o que de fato falta — e aí a razão
    // é visível na tela, porque o campo está ali vazio.
    expect(tela).toMatch(/!selectedDate \|\| !selectedTime/);
  });
});
