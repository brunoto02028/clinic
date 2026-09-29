/**
 * @jest-environment node
 *
 * Marcar sem tipo e sem cobrança (106 T-3).
 *
 * O Bruno, depois de eu perguntar qual das quatro leituras era a dele:
 *
 * > *"Tratamento será colocado pelo terapeuta. Paciente só precisa ter
 * > liberdade, de acordo com a agenda, de agendar uma consulta, que só será
 * > confirmada depois do pagamento. O paciente que já conhecemos, se do lado da
 * > clinic a clínica quiser agendar algo com aquele paciente específico, ela
 * > pode fazer isso sem envolver pagamento."*
 *
 * São dois caminhos com regras opostas, e o sistema já tinha os dois. O que
 * faltava era **a tela mostrar o segundo**: o tipo sempre foi opcional no envio
 * e no servidor, mas o seletor só oferecia tipos com preço, então marcar sem
 * cobrança exigia adivinhar que dava para deixar o campo em branco.
 *
 * Um caminho que existe e não se vê é o mesmo que não existir.
 */
import { lerCodigo } from "../helpers/codigo";

const tela = lerCodigo("app", "admin", "appointments", "page.tsx");
const rota = lerCodigo("app", "api", "admin", "appointments", "route.ts");

describe("a clínica marca sem cobrar", () => {
  it("**o seletor oferece 'sem tipo' como escolha, e não como campo vazio**", () => {
    expect(tela).toContain("SEM_TIPO");
    expect(tela).toMatch(/No treatment type yet/);
    expect(tela).toMatch(/Sem tipo ainda/);
  });

  it("escolher 'sem tipo' zera o preço", () => {
    // Sem isto, trocar de um tipo pago para "sem tipo" deixava o preço do
    // anterior para trás — e a consulta nasceria cobrando.
    const trecho = tela.slice(tela.indexOf("if (v === SEM_TIPO)"), tela.indexOf("const dbOpt"));
    expect(trecho).toMatch(/treatmentType: ""/);
    expect(trecho).toMatch(/price: 0/);
  });

  it("**preço zero não oferece modo de pagamento**", () => {
    // Oferecer "na clínica ou online" numa consulta de preço zero promete uma
    // decisão que não existe.
    expect(tela).toMatch(/Number\(createForm\.price\) > 0 \?/);
    expect(tela).toMatch(/No charge: the appointment is confirmed straight away/);
  });

  it("o campo de tipo nunca foi marcado como obrigatório", () => {
    const rotulo = tela.slice(tela.indexOf('"Tipo de Tratamento"') - 120, tela.indexOf('"Tipo de Tratamento"') + 60);
    expect(rotulo).not.toMatch(/Tipo de Tratamento \*/);
  });

  it("o envio exige paciente, data e hora — e nada mais", () => {
    expect(tela).toMatch(
      /!createForm\.patientId \|\| !createForm\.appointmentDate \|\| !createForm\.appointmentTime/
    );
  });

  it("**sem preço a consulta nasce confirmada** — não há o que pagar", () => {
    // É o que faz "sem cobrança" significar alguma coisa: uma consulta de preço
    // zero em PENDING esperaria para sempre por um pagamento que não existe.
    expect(rota).toMatch(/const nascePaga = precoFinal <= 0/);
  });

  it("o caminho do paciente continua o oposto: paga para confirmar", () => {
    // Os dois caminhos coexistem, e é de propósito.
    expect(rota).toMatch(/status: nascePaga \? "CONFIRMED" : "PENDING"/);
  });
});
