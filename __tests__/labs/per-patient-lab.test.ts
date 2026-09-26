/**
 * @jest-environment node
 *
 * Liberar ou bloquear o laboratório **para um paciente** (26/09/2026).
 *
 * O Bruno: *"eu quero ter a liberdade de liberar o lab para os pacientes ou
 * bloquear o lab para os pacientes. Então ele tem que aparecer ou desaparecer."*
 *
 * A API já obedecia `mod_lab` desde a 083 — o que faltava era a tela onde a
 * decisão se toma, porque `/admin/patients/[id]/permissions` monta a lista a
 * partir do `MODULE_REGISTRY` e as duas **áreas** do app nunca estiveram lá. O
 * servidor sabia respeitar uma decisão que ninguém tinha onde tomar.
 *
 * E a hierarquia é decisão dele: o interruptor de `/admin/labs` é o **padrão da
 * clínica**, não uma chave mestra. Desligado, o laboratório desaparece para
 * todos menos para quem foi liberado — é o que permite um piloto de duas
 * pessoas antes de abrir para todo mundo.
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

const rota = ler("app", "api", "mobile", "modules", "route.ts");
const registro = ler("lib", "module-registry.ts");
const tela = ler("app", "admin", "patients", "[id]", "permissions", "page.tsx");

describe("a decisão tem onde ser tomada", () => {
  it.each(["mod_lab", "mod_clinica"])("%s está no registro de módulos", (chave) => {
    expect(registro).toContain(`key: "${chave}"`);
  });

  it("as duas ficam numa categoria própria — são áreas, não telas", () => {
    for (const chave of ["mod_lab", "mod_clinica"]) {
      const i = registro.indexOf(`key: "${chave}"`);
      expect(registro.slice(i, i + 900)).toContain('category: "app_areas"');
    }
  });

  it("e a tela de permissões renderiza essa categoria", () => {
    // Sem a linha aqui, a entrada existe no registro e não aparece em lugar
    // nenhum — que era exatamente o estado anterior.
    expect(tela).toMatch(/key: "app_areas"/);
  });

  it("a categoria também existe no registro, para quem mais o consome", () => {
    expect(registro).toMatch(/\{ key: "app_areas", label: "App areas"/);
  });

  it("nenhuma das duas é `defaultGranted`", () => {
    // Quem concede a área clínica é ser paciente da clínica; quem concede o
    // laboratório é o interruptor da clínica. A linha por paciente é a exceção
    // de uma pessoa, e uma exceção que vale para todos não é exceção.
    for (const chave of ["mod_lab", "mod_clinica"]) {
      const i = registro.indexOf(`key: "${chave}"`);
      expect(registro.slice(i, i + 900)).not.toContain("defaultGranted");
    }
  });
});

describe("a hierarquia: liberação individual vence o interruptor geral", () => {
  it("o interruptor da clínica deixou de ser a única resposta", () => {
    expect(rota).toMatch(/const labParaEste =/);
    // `labOn` sozinho não decide mais nada: quem decide é `labParaEste`.
    expect(rota).toMatch(/labParaEste \? mods : mods\.filter/);
    expect(rota).toMatch(/if \(labParaEste\) \{/);
  });

  it("liberado para ele vence o geral desligado", () => {
    expect(rota).toMatch(/labOn \|\| labDele === true/);
  });

  it("negado para ele vence o geral ligado", () => {
    // A negação é o primeiro ramo: depois do `||` ela já teria perdido.
    expect(rota).toMatch(/labDele === false \? false : labOn/);
  });

  it("o filtro e a concessão leem a **mesma** variável", () => {
    // Antes eram duas perguntas diferentes — uma filtrava e outra concedia — e
    // foi assim que ligar o laboratório não ligou nada (R1 do review da 083).
    expect(rota).not.toMatch(/labOn &&/);
  });

  it("uma variável de overrides, não duas", () => {
    // Dois nomes para o mesmo dado divergem na primeira edição.
    expect(rota.match(/const overrides = /g)?.length).toBe(1);
  });
});
