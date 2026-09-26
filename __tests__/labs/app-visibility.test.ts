/**
 * @jest-environment node
 *
 * Quem decide se o laboratório aparece no app (081).
 *
 * Era `EXPO_PUBLIC_SHOW_LAB`, inlinado no bundle: mudar de ideia custava um
 * binário, e o interruptor ficava longe de quem decide. Agora é
 * `Clinic.labVisibleInApp`, e o que fica preso aqui é a regra que importa:
 * **desligado, o módulo some para todo mundo** — inclusive para a equipe, que
 * é quem testa. Se a equipe continuasse vendo, "esconder" não esconderia nada
 * de quem olha para conferir.
 */

import fs from "fs";
import path from "path";

const rota = fs.readFileSync(path.join(__dirname, "..", "..", "app", "api", "mobile", "modules", "route.ts"), "utf8");

describe("a rota de módulos", () => {
  it("lê o interruptor da clínica", () => {
    expect(rota).toMatch(/labVisibleInApp: true/);
    expect(rota).toMatch(/const labOn = clinic\?\.labVisibleInApp === true/);
  });

  it("filtra o lab nos dois caminhos — o da equipe e o do paciente", () => {
    // A asserção olha a composição, não a linha inteira: em 26/09 entrou um
    // `semBa` por fora (a BA não é do app da clínica) e fixar a grafia fazia
    // este teste reprovar a mudança em vez do defeito.
    expect(rota).toMatch(/withTraining\(sem\w+\(semLab\(\[\.\.\.MODULE_DEFS\]\)\)\)/);
    expect(rota).toMatch(/withTraining\(sem\w+\(semLab\(result\)\)\)/);
  });

  it("o filtro remove exatamente a chave `lab`", () => {
    expect(rota).toMatch(/mods\.filter\(\(m\) => m\.key !== "lab"\)/);
  });

  it("e a resposta CONCEDE, não só remove — ligar tem que ligar", () => {
    // Escrito só como filtro, ligar o laboratório não ligava nada: o paciente
    // seguia preso a uma linha DIAGNOSTICS que a BPR nunca teve (R1 do review
    // da 083).
    //
    // A asserção deixou de citar a grafia de então (`labOn && overrideGrants(…)`)
    // porque em 26/09 a regra mudou — a liberação individual passou a vencer o
    // interruptor geral — e um teste que fixa a grafia reprova a mudança em vez
    // do defeito. O que ele guarda é a propriedade: **a mesma** variável filtra
    // e concede, e concede de verdade.
    expect(rota).toMatch(/if \(labParaEste\) \{/);
    expect(rota).toMatch(/keys\.add\("lab"\)/);
    expect(rota).toMatch(/labParaEste \? mods : mods\.filter/);
  });
});

describe("o app não decide mais sozinho", () => {
  const ler = (...p: string[]) => fs.readFileSync(path.join(__dirname, "..", "..", "mobile", ...p), "utf8");

  it("SHOW_LAB não existe mais", () => {
    expect(ler("src", "lib", "feature-flags.ts")).not.toMatch(/export const SHOW_LAB/);
    expect(ler("src", "components", "ModuleGuard.tsx")).not.toMatch(/SHOW_LAB/);
    expect(ler("app", "(app)", "module-select.tsx")).not.toMatch(/SHOW_LAB/);
  });

  it("a guarda concede só o que o servidor listou", () => {
    expect(ler("src", "components", "ModuleGuard.tsx")).toMatch(
      /const granted = modules\?\.some\(\(m\) => m\.key === module\);/
    );
  });

  it("o eas.json não carrega mais o interruptor de build", () => {
    expect(ler("eas.json")).not.toMatch(/EXPO_PUBLIC_SHOW_LAB/);
  });
});
