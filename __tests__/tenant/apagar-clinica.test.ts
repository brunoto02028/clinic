/**
 * @jest-environment node
 *
 * Apagar uma clínica (26/09/2026).
 *
 * O Bruno: *"a clínica Bruno pode apagar, tá errada, era só de teste."*
 *
 * **O item de menu "Delete Clinic" existia sem `onClick`.** Decorativo desde
 * sempre — e foi só por isso que nada se perdeu, porque a rota por trás era um
 * `prisma.clinic.delete` cru, sem verificação nenhuma, e `User.clinicId` tem
 * `onDelete: Cascade`. Um toque ali apagaria todo paciente daquela clínica,
 * todo prontuário, toda consulta, sem aviso e sem volta.
 *
 * Estes testes guardam as duas travas. Nenhuma delas impede o dono de apagar o
 * que ele quer apagar — elas só fazem a decisão acontecer com o número na
 * frente, e na linha certa.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const rota = ler("app", "api", "admin", "clinics", "[id]", "route.ts");
const tela = ler("app", "admin", "clinics", "page.tsx");
const lib = ler("lib", "clinic-contents.ts");
const schema = ler("prisma", "schema.prisma");

describe("o motivo de tudo isto existir", () => {
  it("o `User` realmente cascateia com a clínica", () => {
    // Se um dia isto virar `SetNull`, metade destas travas deixa de fazer
    // sentido — e é melhor o teste cair do que ninguém notar.
    const i = schema.indexOf("model User ");
    const fim = schema.indexOf("\n}", i);
    expect(schema.slice(i, fim)).toMatch(
      /clinic\s+Clinic\?\s+@relation\(fields: \[clinicId\], references: \[id\], onDelete: Cascade\)/
    );
  });

  it("e não é só o `User` — são dezenas de tabelas", () => {
    const cascatas = (schema.match(/@relation\(fields: \[clinicId\][^)]*onDelete: Cascade/g) ?? []).length;
    expect(cascatas).toBeGreaterThan(50);
  });
});

describe("a trava do nome", () => {
  it("a rota exige o nome exato", () => {
    // Numa lista de clínicas, a linha errada fica a um pixel da certa.
    expect(rota).toMatch(/const confirmacao = request\.nextUrl\.searchParams\.get\("confirm"\)/);
    expect(rota).toMatch(/if \(confirmacao !== conteudo\.name\)/);
  });

  it("e diz qual nome esperava, sem apagar nada", () => {
    expect(rota).toMatch(/expected: conteudo\.name/);
    expect(rota).toMatch(/\{ status: 400 \}/);
  });

  it("o botão da tela fica desligado até o nome bater", () => {
    expect(tela).toMatch(/disabled=\{nomeDigitado !== apagando\?\.name \|\| apagandoAgora\}/);
  });
});

describe("a trava do conteúdo", () => {
  it("clínica com gente dentro precisa de `force`", () => {
    // Não é proibição: é a diferença entre "apaguei um cadastro de teste" e
    // "apaguei quarenta pacientes achando que era teste".
    expect(rota).toMatch(/if \(conteudo\.total > 0 && !forcar\)/);
    expect(rota).toMatch(/\{ status: 409 \}/);
  });

  it("e a recusa devolve **o que** está lá dentro", () => {
    const i = rota.indexOf("if (conteudo.total > 0 && !forcar)");
    expect(rota.slice(i, i + 300)).toMatch(/conteudo,/);
  });

  it("a contagem cobre o que dói perder", () => {
    for (const campo of [
      "pacientes",
      "equipe",
      "consultas",
      "notasClinicas",
      "pedidosDeExame",
      "videosDeExercicio",
      "mensagens",
    ]) {
      expect(lib).toContain(`${campo}:`);
    }
  });

  it("uma tabela que não existe não derruba a contagem inteira", () => {
    // A contagem é informação para decidir; falhar nela não pode virar um
    // diálogo que não abre.
    expect(lib).toMatch(/\.catch\(\(\) => 0\)/);
  });

  it("`total` zero significa que nada se perde", () => {
    expect(lib).toMatch(/total:\s*\n?\s*pacientes \+ equipe/);
    expect(tela).toMatch(/This clinic is empty\. Nothing is lost\./);
  });
});

describe("só o dono, e o que sobra depois", () => {
  it.each(["GET", "DELETE"])("%s exige SUPERADMIN", (verbo) => {
    const i = rota.indexOf(`export async function ${verbo}(`);
    expect(rota.slice(i, i + 400)).toMatch(/role !== "SUPERADMIN"/);
  });

  it("uma exclusão deixa registro de quem e de quanto", () => {
    // É a única coisa que sobra depois de uma cascata.
    expect(rota).toMatch(/\[clinic-delete\]/);
    expect(rota).toMatch(/\$\{conteudo\.pacientes\} pacientes/);
  });
});

describe("o botão deixou de ser enfeite", () => {
  it("agora ele chama alguma coisa", () => {
    expect(tela).toMatch(/onClick=\{\(\) => void abrirExclusao\(clinic\)\}/);
  });

  it("e o diálogo mostra o que morre junto antes de perguntar", () => {
    expect(tela).toMatch(/Everything below is deleted with the clinic/);
    expect(tela).toMatch(/\["Patients", conteudo\.pacientes\]/);
    expect(semComentarios(tela)).toMatch(/Delete permanently/);
  });

  it("a lista só perde a linha depois de o servidor confirmar", () => {
    // Tirar antes faria a tela mentir quando a exclusão falhasse.
    const i = tela.indexOf("const confirmarExclusao");
    const bloco = tela.slice(i, i + 1200);
    expect(bloco.indexOf("if (!r.ok)")).toBeLessThan(bloco.indexOf("setClinics((cs)"));
  });
});
