/**
 * @jest-environment node
 *
 * Um dia **antes de o aparelho existir** não é um dia sem leitura (120 T-11).
 *
 * ## O que ele viu
 *
 * A tela de trinta dias dizia, por baixo de cada métrica:
 *
 * > *27 days without a reading — shown as a gap, not as zero.*
 *
 * E o Bruno, 03/10/2026:
 *
 * > *"é irrelevante, porque faz dois dias que chegou o relógio e eu comecei a
 * > fazer as medições. O mais importante é estar sincronizado com o dia atual e
 * > hora atual."*
 *
 * ## Porque isto importa mais para os pacientes do que para ele
 *
 * Ele sabe o que é o aviso. Um paciente que liga o aparelho hoje abre a tela e
 * lê **"29 dias sem leitura"** — no primeiro dia de uso, sobre uma conta que
 * acabou de ser ligada. É uma frase que se lê como avaria e descreve o normal,
 * e seria a primeira coisa que toda a gente veria no lançamento.
 *
 * A distinção é essa: **ausência de dado** e **ausência de aparelho** não são a
 * mesma coisa, e só uma delas é notícia.
 *
 * ## Porque a contagem vive na lib e não no componente
 *
 * Mesma razão de `regra-provada-na-funcao-desfeita-no-jsx`: uma regra provada
 * dentro da função e desfeita no desenho passa em todos os testes e mente na
 * tela.
 */

import { diasSemLeitura, PontoDaSerie } from "../../mobile/src/lib/tendencia-calculo";

/** Trinta dias a acabar em 03/10/2026, com leitura só nos últimos `comDados`. */
const janela = (comDados: number): PontoDaSerie[] => {
  const pontos: PontoDaSerie[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 9, 3));
    d.setUTCDate(d.getUTCDate() - i);
    const dia = d.toISOString().slice(0, 10);
    pontos.push({ dia, valor: i < comDados ? 3000 + i : null });
  }
  return pontos;
};

describe("os dias antes da ligação não contam", () => {
  it("**o relógio chegou há dois dias → dois dias de janela, zero buracos**", () => {
    /* Exactamente o caso dele: 28 dias sem aparelho, 2 dias a medir. */
    expect(diasSemLeitura(janela(2), "2026-10-02")).toBe(0);
  });

  it("**e um paciente que liga hoje não abre a tela com um alarme**", () => {
    expect(diasSemLeitura(janela(1), "2026-10-03")).toBe(0);
  });

  it("**mas um buraco depois da ligação continua a contar** — é a notícia que interessa", () => {
    /*
     * Ligado a 20/09, com leitura só nos últimos 2 dias: 11 dias de silêncio
     * **com** aparelho. É isto que não pode ser escondido junto com o resto —
     * foi assim que a cadeia de tokens morreu durante 27 dias sem ninguém ver.
     */
    expect(diasSemLeitura(janela(2), "2026-09-20")).toBe(12);
  });

  it("**o dia da ligação conta como dia de aparelho**", () => {
    /* Ligou de manhã e não mediu: é silêncio, e é para aparecer. */
    expect(diasSemLeitura(janela(0), "2026-10-03")).toBe(1);
  });

  it("sem saber quando foi ligado, conta tudo — que é o que havia", () => {
    expect(diasSemLeitura(janela(3))).toBe(27);
    expect(diasSemLeitura(janela(3), null)).toBe(27);
  });

  it("e uma janela toda com dados não tem buraco nenhum", () => {
    expect(diasSemLeitura(janela(30), "2026-01-01")).toBe(0);
  });
});

describe("a frase só aparece quando há o que dizer", () => {
  it("**zero buracos → a tela não escreve nada**", () => {
    /*
     * O componente só desenha a linha com `semLeitura > 0`. Com a contagem a
     * dar zero, a frase desaparece — que é o ponto inteiro desta tarefa.
     */
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const tela = readFileSync(
      join(__dirname, "..", "..", "mobile", "src", "components", "Tendencia.tsx"),
      "utf8"
    );
    expect(tela).toMatch(/semLeitura > 0 &&/);
    /* E a contagem vem da lib, não de um `filter` refeito aqui dentro. */
    expect(tela).toMatch(/const semLeitura = diasSemLeitura\(pontos, desde\)/);
  });
});
