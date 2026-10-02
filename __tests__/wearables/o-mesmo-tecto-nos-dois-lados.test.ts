/**
 * @jest-environment node
 *
 * O app e o painel contam o mesmo número de ECG.
 *
 * ## O defeito, apanhado antes de alguém lhe bater
 *
 * O painel da clínica cortava a lista em 100 registos; a rota do app não
 * cortava em nada. Com a mesma janela de dias, um paciente com mais de cem
 * gravações no período veria **números diferentes** no telemóvel e na ficha — e
 * seria o terapeuta a dizer *"aqui só tenho cem"* sobre uma lista que o
 * paciente vê inteira.
 *
 * É o mesmo desacordo que a 119 T-2 existe para fechar. Antes dela, uma tela
 * mostrava um ECG por dia e a outra mostrava outro, e **nenhuma das duas
 * parecia errada**. Fechar o modelo e deixar o limite assimétrico seria repor o
 * problema por outra porta.
 *
 * Achado do QA de 02/10/2026, quando ainda era teórico — o Bruno tinha um
 * registo. Um limite assimétrico por acidente corrige-se melhor antes de
 * alguém o atingir do que depois.
 *
 * ## E porque o corte é **dito**
 *
 * Cortar uma lista clínica em silêncio é a mesma classe de coisa que o resto
 * desta atividade: um ECG que some sem deixar buraco. Quem atingir o tecto tem
 * de saber que há mais.
 */

import fs from "fs";
import path from "path";
import { MAXIMO_DE_ECGS, cortouRegistos, ateAoLimite } from "../../lib/ecg-limite";

const lerRota = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");

const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

describe("o tecto", () => {
  it("corta no máximo e não um a mais", () => {
    const cem = Array.from({ length: MAXIMO_DE_ECGS + 5 }, (_, i) => i);
    expect(ateAoLimite(cem)).toHaveLength(MAXIMO_DE_ECGS);
    expect(ateAoLimite(cem)[0]).toBe(0);
  });

  it("uma lista curta passa inteira", () => {
    expect(ateAoLimite([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("**diz quando cortou**, e não quando coube tudo", () => {
    expect(cortouRegistos(MAXIMO_DE_ECGS + 1)).toBe(true);
    expect(cortouRegistos(MAXIMO_DE_ECGS)).toBe(false);
    expect(cortouRegistos(0)).toBe(false);
  });
});

describe("as duas rotas usam o mesmo tecto", () => {
  const doPaciente = semComentarios(lerRota("app", "api", "wearables", "data", "route.ts"));
  const doPainel = semComentarios(
    lerRota("app", "api", "admin", "patients", "[id]", "monitoring", "route.ts")
  );

  it("**nenhuma das duas escreve um número à mão**", () => {
    /*
     * Um `take: 100` literal numa delas é como o defeito começou: o número
     * estava num sítio só, e o outro lado não tinha número nenhum.
     */
    expect(doPaciente).not.toMatch(/take:\s*\d+/);
    expect(doPainel).not.toMatch(/take:\s*\d+/);
  });

  it("as duas pedem `MAXIMO_DE_ECGS + 1`", () => {
    // O `+ 1` é o que permite saber que houve corte sem contar a tabela toda.
    expect(doPaciente).toMatch(/take:\s*MAXIMO_DE_ECGS \+ 1/);
    expect(doPainel).toMatch(/take:\s*MAXIMO_DE_ECGS \+ 1/);
  });

  it("**as duas dizem se cortaram**", () => {
    expect(doPaciente).toMatch(/ecgsCortados/);
    expect(doPainel).toMatch(/ecgsCortados/);
  });

  it("e as duas importam do mesmo ficheiro", () => {
    expect(doPaciente).toMatch(/from ['"]@\/lib\/ecg-limite['"]/);
    expect(doPainel).toMatch(/from ['"]@\/lib\/ecg-limite['"]/);
  });
});
