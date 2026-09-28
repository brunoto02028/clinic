/**
 * @jest-environment node
 *
 * O aviso de quem você cuida chega a você (092 T-8).
 *
 * ## O silêncio que isto termina
 *
 * Uma criança cadastrada como paciente gerida (091 T-7) nasce com
 * `pushEnabled: false` e **nunca** registra aparelho: ela não faz login, não tem
 * senha, e o endereço dela é sintético. Então todo aviso endereçado a ela morria
 * no filtro `pushEnabled: true` — em silêncio, sem erro em lugar nenhum. A mãe
 * não era avisada da consulta da filha.
 *
 * ## E por que rotear não bastava
 *
 * Mandar o aviso da filha para o telefone da mãe **sem dizer de quem é** faria
 * ela ler *"sua sessão é amanhã às 15h"* e ir ela mesma. É o mesmo erro que a
 * 092 corrigiu hoje no medidor de pressão: a leitura ia para um prontuário por
 * sorte e para o errado em silêncio. Rotear e nomear são a mesma tarefa.
 */

import { lerCodigo } from "../helpers/codigo";

const push = lerCodigo("lib", "push-send.ts");

describe("quem é gerido não tem aparelho, e o aviso acha quem responde", () => {
  it("**a tradução acontece no ponto único**", () => {
    // O mesmo lugar onde o silêncio do paciente já é respeitado. Espalhar isto
    // pelos chamadores seria uma regra que depende de todos lembrarem dela.
    expect(push).toMatch(/async function aparelhosDe\(/);
    expect(push).toMatch(/select: \{ id: true, firstName: true, managedById: true \}/);
  });

  it("quem tem `managedById` vira o destinatário dele", () => {
    expect(push).toMatch(/const destino = \(p as any\)\.managedById as string \| null;/);
    expect(push).toMatch(/porConta\.set\(destino, nomes\)/);
  });

  it("**e o `pushEnabled` que vale é o de quem recebe**", () => {
    // Se a mãe desligou os avisos, o da filha também se cala — senão a criança
    // seria um jeito de furar o silêncio que a mãe pediu.
    const i = push.indexOf("const destinos =");
    const bloco = push.slice(i, i + 400);
    expect(bloco).toMatch(/where: \{ id: \{ in: destinos \}, pushEnabled: true \}/);
  });

  it("o destinatário não se repete", () => {
    // Uma mãe com dois filhos tem um telefone, não três.
    expect(push).toMatch(/\[\.\.\.new Set\(\[\.\.\.proprios, \.\.\.porConta\.keys\(\)\]\)\]/);
  });
});

describe("o aviso diz de quem é", () => {
  it("**o nome entra no corpo da mensagem**", () => {
    expect(push).toMatch(/body: a\.porContaDe \? `\$\{a\.porContaDe\}: \$\{payload\.body\}` : payload\.body/);
  });

  it("e vai no `data`, para a tela abrir a pessoa certa", () => {
    expect(push).toMatch(/\.\.\.\(a\.porContaDe \? \{ porContaDe: a\.porContaDe \} : \{\}\)/);
  });

  it("**mas não entra quando o aviso é sobre quem recebe**", () => {
    // Um comunicado geral chega à mãe como recado da clínica, uma vez, sem
    // prefixo — e não como se fosse sobre a filha, nem em três cópias.
    expect(push).toMatch(/const nomes = proprios\.has\(t\.userId\) \? undefined : porConta\.get\(t\.userId\)/);
  });

  it("e um nome não precisa de tradução", () => {
    // O prefixo serve as duas línguas sem depender de quem chamou ter passado
    // a língua certa.
    expect(push).not.toMatch(/porContaDe.*\b(en|pt):/);
  });
});

describe("a prévia conta a mesma coisa que o envio", () => {
  it("**`countPushDevices` usa o mesmo caminho**", () => {
    // Se a contagem não traduzisse também, a tela prometeria "0 aparelhos" e
    // o envio acertaria 1 — ou o contrário, que é pior.
    expect(push).toMatch(/return \(await aparelhosDe\(userIds\)\)\.length/);
  });

  it("e o envio continua respeitando o portão de saída", () => {
    // O mesmo portão que segura e-mail em QA: push não tem desfazer.
    expect(push).toMatch(/if \(!outboundAllowed\(userIds\)\)/);
    expect(push.indexOf("outboundAllowed(userIds)")).toBeLessThan(push.indexOf("for (let i = 0"));
  });
});
