/**
 * @jest-environment node
 *
 * Um inquilino só, nas rotas que mandam material ao paciente (096 T-6, passo 4).
 *
 * A tarefa pedia para conferir a parede de inquilino **antes** de dar a estas
 * rotas uma porta mais visível. A conferência achou o que temia, e uma coisa
 * pior do que o esperado.
 *
 * ## Dois inquilinos no mesmo handler
 *
 * `assignments` usava **dois** critérios para "a minha clínica":
 *
 * | o quê | de onde vinha |
 * |---|---|
 * | a guarda do paciente (`assertPatientAccess`) | `getActor`, que honra o cookie de clínica selecionada |
 * | o material e o `clinicId` da linha nova | `session.user.clinicId`, a clínica **de origem** de quem está logado |
 *
 * Para toda a gente menos um superadmin que trocou de clínica, os dois dão a
 * mesma resposta — e é por isso que ninguém reparou.
 *
 * Para esse, davam respostas diferentes: o paciente da clínica B passava a
 * guarda, o material tinha de ser da A, e a linha nascia carimbada com A.
 * **Material de uma clínica ligado ao paciente de outra** — a mesma forma do
 * vazamento do envio em massa de 11/09/2026: o id vem de fora, o tenant vem de
 * dois sítios, e ninguém confere que combinam.
 *
 * `send` — que alcança **todos** os pacientes de uma clínica — lia a clínica só
 * da sessão. Com a clínica errada, o alcance do engano é o tamanho da lista.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

function codigo(...partes: string[]): string {
  return fs
    .readFileSync(path.join(RAIZ, ...partes), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const ROTAS: Array<[string, string[]]> = [
  ["assignments", ["app", "api", "admin", "education", "assignments", "route.ts"]],
  ["send", ["app", "api", "admin", "education", "send", "route.ts"]],
];

describe("a clínica vem de um sítio só", () => {
  it.each(ROTAS)("**%s não lê a clínica da sessão**", (_nome, partes) => {
    // `session.user.clinicId` é a clínica de origem de quem está logado, e não
    // a que ele está a ver. Esta casa já marcou este padrão como suspeito
    // depois do vazamento da lista de pacientes por `?clinicId`.
    const c = codigo(...partes);
    expect(c).not.toMatch(/const clinicId = user\.clinicId/);
  });

  it.each(ROTAS)("**%s resolve pelo `getActor`**", (_nome, partes) => {
    const c = codigo(...partes);
    expect(c).toContain("getActor(req)");
    expect(c).toMatch(/actor\??\.clinicId/);
  });

  it("**a atribuição escreve a clínica do ator, e não a da sessão**", () => {
    // O carimbo da linha nova é o que decide de quem é a atribuição. Era ele
    // que divergia da guarda.
    const c = codigo(...ROTAS[0][1]);
    expect(c).toMatch(/where: \{ id: contentId, clinicId: clinicDoAtor \}/);
    // **Dentro do `data:` da criação**, e não em qualquer sítio do arquivo: a
    // primeira versão deste teste procurava `clinicId: clinicDoAtor` solto, e
    // a mutação que devolvia a escrita à sessão passava incólume, porque a
    // outra ocorrência — a do `where` — continuava lá. O carimbo da linha nova
    // é o que decide de quem é a atribuição, e é esse que tem de ser fixado.
    const i = c.indexOf("educationAssignment.create");
    expect(i).toBeGreaterThan(0);
    const criacao = c.slice(i, i + 400);
    expect(criacao).toContain("clinicId: clinicDoAtor");
    expect(criacao).not.toMatch(/clinicId: user\.clinicId/);
  });

  it("**a guarda do paciente e a escrita usam o mesmo ator**", () => {
    // O ponto inteiro: um objeto, lido pelos dois lados. Se alguém voltar a
    // buscar um segundo, isto cai.
    const c = codigo(...ROTAS[0][1]);
    expect(c).toMatch(/assertPatientAccess\(actor,/);
    expect(c).not.toMatch(/actorParaChecar/);
  });

  it("o material continua a ter de ser da mesma clínica", () => {
    // A conferência do id que vem de fora não se perdeu na mudança — ela é a
    // metade que impede ler o texto de outra clínica pela resposta.
    const c = codigo(...ROTAS[0][1]);
    expect(c).toContain("educationContent.findFirst");
    expect(c).toMatch(/status: 404/);
  });

  it("**a lista nunca fica sem filtro de clínica**", () => {
    // Era `clinicId ? { clinicId } : {}` — e esse `{}` lista as atribuições de
    // **todas as clínicas**. Um superadmin sem clínica própria via o material
    // de toda a gente, e nada na resposta dizia isso.
    const c = codigo(...ROTAS[0][1]);
    expect(c).not.toMatch(/clinicId \? \{ clinicId \} : \{\}/);
    expect(c).toMatch(/const where: any = \{ clinicId \}/);
  });

  it("**e o `patientId` da barra de endereços é conferido**", () => {
    // Mesma forma do vazamento da lista de pacientes por `?clinicId`: o id vem
    // de fora e ninguém pergunta se é desta clínica.
    const c = codigo(...ROTAS[0][1]);
    const i = c.indexOf("searchParams.get('patientId')");
    expect(i).toBeGreaterThan(0);
    expect(c.slice(i, i + 400)).toContain("assertPatientAccess(actor, patientId)");
  });

  it("**o envio em massa filtra os pacientes pela clínica do ator**", () => {
    // É a linha que decide o alcance: `role: "PATIENT"` dentro de um `clinicId`
    // errado é uma lista inteira de gente errada.
    const c = codigo(...ROTAS[1][1]);
    expect(c).toMatch(/where: \{ clinicId, role: "PATIENT", isActive: true \}/);
  });
});
