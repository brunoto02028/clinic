/**
 * @jest-environment node
 *
 * O pedido sabe de quem é o exame (091 T-3).
 *
 * O Bruno, 27/09: *"se um pai ou uma mãe quiser cadastrar um dependente para
 * que esses exames saiam no nome da criança, precisamos ter essa opção."*
 *
 * **O defeito que este bloco existe para impedir é o mais silencioso deste
 * módulo.** O laboratório emite laudo com faixa de referência por idade. Mandar
 * o nome e a data de nascimento do pai junto da amostra da filha produz um
 * laudo errado com toda a aparência de certo — ninguém percebe, e o resultado
 * é lido como verdade.
 */

import { ler } from "../helpers/codigo";

const schema = ler("prisma", "schema.prisma");
const pedido = schema.slice(schema.indexOf("model LabOrder "), schema.indexOf("\n}", schema.indexOf("model LabOrder ")));

describe("o sujeito no banco", () => {
  it("o pedido aponta para um dependente, e o campo é opcional", () => {
    // Opcional porque nulo é "do próprio titular" — o sentido de todo pedido
    // feito antes disto. Um campo obrigatório mudaria o significado do que já
    // está gravado.
    expect(pedido).toMatch(/subjectId\s+String\?/);
    expect(pedido).toMatch(/subject\s+User\?\s+@relation\("LabOrderSubject"/);
  });

  it("**remover a pessoa não apaga o exame dela** — SetNull, não Cascade", () => {
    // O resultado de uma amostra que a LML já analisou não pode sumir porque
    // alguém arrumou a lista de pessoas da conta.
    const linha = pedido.split("\n").find((l) => l.includes("LabOrderSubject"))!;
    expect(linha).toMatch(/onDelete: SetNull/);
    expect(linha).not.toMatch(/onDelete: Cascade/);
  });
});

describe("a identidade que vai para o laboratório", () => {
  const lab = ler("lib", "lab-patient.ts");

  it("existe uma função só para isso, e ela prefere o sujeito", () => {
    expect(lab).toMatch(/export async function identidadeParaOLaboratorio/);
    expect(lab).toMatch(/if \(o\.subject\) \{/);
  });

  it("e o titular é a queda, não a regra", () => {
    const i = lab.indexOf("identidadeParaOLaboratorio");
    const corpo = lab.slice(i, lab.indexOf("\n}", i));
    // O sujeito tem de ser testado **antes** do paciente. Invertido, todo
    // exame sairia no nome do titular e nada acusaria.
    expect(corpo.indexOf("o.subject")).toBeLessThan(corpo.indexOf("o.patient"));
  });
});

describe("a tela diz de quem é", () => {
  it("o pedido mostra o nome do sujeito quando não é o titular", () => {
    const tela = ler("mobile", "app", "(app)", "(lab)", "order", "[id].tsx");
    expect(tela).toMatch(/testID="pedido-sujeito"/);
    expect(tela).toMatch(/en: `For \$\{o\.subject\.firstName\}/);
  });

  it("e o checkout pergunta antes, com o titular como padrão", () => {
    const checkout = ler("mobile", "app", "(app)", "(lab)", "checkout.tsx");
    expect(checkout).toMatch(/Who is this test for\?/);
    expect(checkout).toMatch(/useState<string \| null>\(null\)/);
    expect(checkout).toMatch(/dependentId: paraQuem/);
  });

  it("a lista de escolha some quando só há uma resposta possível", () => {
    // Um botão de rádio sozinho não é escolha, é enfeite.
    const checkout = ler("mobile", "app", "(app)", "(lab)", "checkout.tsx");
    expect(checkout).toMatch(/\(dependentes\.data \?\? \[\]\)\.length > 0 \? "flex" : "none"/);
  });
});

describe("a rota do pedido", () => {
  const rota = ler("app", "api", "mobile", "labs", "orders", "route.ts");

  it("confere o dono **antes** de gravar", () => {
    // Gravar primeiro e conferir depois deixaria, por um instante, um exame
    // apontando para o filho de outra pessoa.
    const iCheck = rota.indexOf("managedById: payload.sub");
    const iCreate = rota.indexOf("prisma.labOrder.create");
    expect(iCheck).toBeGreaterThan(-1);
    expect(iCheck).toBeLessThan(iCreate);
  });

  it("e a busca leva o responsável junto do id", () => {
    expect(rota).toMatch(/id: String\(body\.dependentId\), managedById: payload\.sub/);
  });

  it("e uma pessoa desligada não serve de sujeito", () => {
    // Remover é desligar (`deletedAt`), não apagar. Sem esta condição, um
    // exame poderia nascer no nome de quem a mãe já tirou da conta.
    expect(rota).toMatch(/managedById: payload\.sub, deletedAt: null/);
  });

  it("dependente de outra conta responde 404, não 403", () => {
    // 403 confirmaria que aquele id existe. 404 não confirma nem desmente.
    const i = rota.indexOf("body.dependentId");
    expect(rota.slice(i, i + 700)).toMatch(/status: 404/);
  });

  it("**exame de 16+ para criança é recusado pelo servidor**", () => {
    // A tela é sugestão; o servidor é garantia. Nada impede alguém de montar o
    // pedido por fora.
    expect(rota).toMatch(/idadeDoSujeito !== null && idadeDoSujeito < 16/);
    expect(rota).toMatch(/kit\?\.notUnder16 === true/);
    expect(rota).toMatch(/code: "age_restricted"/);
  });

  it("e a recusa nomeia o exame, nas duas línguas", () => {
    expect(rota).toMatch(/\$\{restrito\.name\} is only available from age 16/);
    expect(rota).toMatch(/\$\{restrito\.name\} só está disponível a partir dos 16 anos/);
  });
});
