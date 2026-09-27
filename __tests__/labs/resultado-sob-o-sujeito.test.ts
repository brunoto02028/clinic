/**
 * @jest-environment node
 *
 * O resultado diz de quem é (091 T-5).
 *
 * Um laudo de laboratório traz faixa de referência **por idade**. Mostrá-lo sem
 * dizer de quem é, numa conta que pede exame para mais de uma pessoa, é
 * convidar a leitura errada — e a leitura errada aqui não parece errada: os
 * números estão certos, só que a régua é de outra pessoa.
 *
 * Por isso o nome aparece nos quatro lugares em que um resultado é visto: a
 * lista de pedidos, o pedido, o laudo, e a tela da clínica.
 */

import { ler } from "../helpers/codigo";

describe("no app do paciente", () => {
  it("a lista de pedidos mostra de quem é", () => {
    // Sem isto a mãe precisa abrir cada pedido para saber de quem é — e, pior,
    // é convidada a supor.
    const lista = ler("mobile", "app", "(app)", "(lab)", "(tabs)", "orders.tsx");
    expect(lista).toMatch(/item\.subject && \(/);
    expect(lista).toMatch(/lab-order-sujeito-/);
  });

  it("o pedido mostra de quem é", () => {
    const pedido = ler("mobile", "app", "(app)", "(lab)", "order", "[id].tsx");
    expect(pedido).toMatch(/testID="pedido-sujeito"/);
  });

  it("**e o laudo mostra o nome e a idade**", () => {
    // É a tela onde a atribuição errada custa mais caro.
    const laudo = ler("mobile", "app", "(app)", "(lab)", "result", "[id].tsx");
    expect(laudo).toMatch(/testID="resultado-sujeito"/);
    expect(laudo).toMatch(/o\.subject\.idade != null/);
  });

  it("e quando o exame é do próprio titular, nada disso aparece", () => {
    // `subject` nulo é o caso comum. Escrever "para você" em todo pedido seria
    // ruído em 99% das telas.
    for (const tela of [
      ler("mobile", "app", "(app)", "(lab)", "(tabs)", "orders.tsx"),
      ler("mobile", "app", "(app)", "(lab)", "order", "[id].tsx"),
      ler("mobile", "app", "(app)", "(lab)", "result", "[id].tsx"),
    ]) {
      expect(tela).toMatch(/(item|o)\.subject && \(/);
    }
  });
});

describe("na tela da clínica", () => {
  const rota = ler("app", "api", "admin", "labs", "orders", "route.ts");
  const pagina = ler("app", "admin", "labs", "orders", "page.tsx");

  it("a rota devolve o sujeito, com a idade calculada", () => {
    expect(rota).toMatch(/subject: \{ select: \{ id: true, firstName: true, lastName: true, dateOfBirth: true \} \}/);
    expect(rota).toMatch(/idade: o\.subject\.dateOfBirth \? idadeEmAnos\(o\.subject\.dateOfBirth\) : null/);
  });

  it("**a tabela mostra quem fez o exame, e quem pediu por baixo**", () => {
    // Mostrar só o titular faria a clínica ler o laudo da filha como se fosse
    // o da mãe.
    expect(pagina).toMatch(/r\.subject \? \(/);
    expect(pagina).toMatch(/\{ui\.orderedBy\}/);
  });

  it("e o rótulo existe nas duas línguas", () => {
    expect(pagina).toMatch(/orderedBy: "ordered by"/);
    expect(pagina).toMatch(/orderedBy: "pedido por"/);
  });

  it("sem sujeito, a coluna continua como sempre foi", () => {
    expect(pagina).toMatch(/\) : r\.patient \? \(/);
  });
});

describe("e o dado que sustenta tudo isso", () => {
  const lab = ler("lib", "lab-patient.ts");

  it("o pedido carrega o sujeito junto", () => {
    expect(lab).toMatch(/subject: \{ select: \{ id: true, firstName: true, lastName: true, dateOfBirth: true \} \}/);
  });

  it("a idade vai calculada, e nulo não vira idade inventada", () => {
    // `dateOfBirth` é opcional em `User`. Uma pessoa gerida sempre tem a sua,
    // mas o tipo não promete isso.
    expect(lab).toMatch(/idade: o\.subject\.dateOfBirth \? idadeEmAnos\(o\.subject\.dateOfBirth\) : null/);
  });
});
