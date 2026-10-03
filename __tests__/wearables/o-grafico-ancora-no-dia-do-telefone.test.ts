/**
 * @jest-environment node
 *
 * As barras da aba Saúde ancoram no dia **do telefone** (118 T-9).
 *
 * ## O achado
 *
 * `tendenciaEmBarras` ancorava a janela em `agora.toISOString().slice(0,10)` —
 * o dia em **UTC**. O ficheiro gémeo, na mesma pasta, diz por extenso o
 * contrário (*"a chave em UTC já mordeu três vezes nesta base"*), e a ingestão
 * grava o dia **local** de quem mediu.
 *
 * Para um paciente em UTC−3, entre as 21:00 e a meia-noite as duas contas
 * divergem: a janela andava um dia para a frente, a leitura mais antiga caía
 * fora dela e **o gráfico desaparecia** — para voltar à meia-noite, sem nada a
 * explicar.
 *
 * ## Porque isto se mede com um `jest.mock`, e não mudando o fuso
 *
 * O `jest.config.js` faz `process.env.TZ = 'UTC'` **no processo principal**,
 * antes de os workers nascerem, e dentro do sandbox do jest atribuir
 * `process.env.TZ` não chega ao motor — medido: o fuso não muda. Logo sob o
 * jest não há forma de pôr o processo em UTC−3.
 *
 * E não é preciso. A propriedade em causa é *"o início da janela vem do dia
 * local, não do `toISOString`"*, e isso mede-se na junta: `diaLocal` é o que
 * sabe o fuso, e tem os seus próprios testes. Aqui faz-se `diaLocal` devolver
 * o dia de um telefone em UTC−3 e confirma-se que a janela o segue.
 */

/**
 * O dia de um telefone em UTC−3, calculado à mão a partir do instante.
 *
 * Não chama `Date` nenhum: é aritmética sobre o instante, para o resultado não
 * depender do fuso em que o jest corre.
 */
jest.mock("../../mobile/src/lib/dia-e-noite-calculo", () => ({
  diaLocal: (d: Date = new Date()) =>
    new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 10),
}));

import { tendenciaEmBarras } from "../../mobile/src/lib/barras-da-metrica";
import { diaLocal } from "../../mobile/src/lib/dia-e-noite-calculo";

/** 22:00 de 2 de Outubro em São Paulo. Em UTC já é **dia 3**. */
const AS_DEZ_DA_NOITE = new Date("2026-10-03T01:00:00.000Z");

const serie = [
  { dia: "2026-09-19", valor: 50 },
  { dia: "2026-09-20", valor: 52 },
];

describe("em UTC−3, à noite", () => {
  it("o cenário é mesmo o que se pensa — senão o resto não mede nada", () => {
    expect(diaLocal(AS_DEZ_DA_NOITE)).toBe("2026-10-02");
    expect(AS_DEZ_DA_NOITE.toISOString().slice(0, 10)).toBe("2026-10-03");
  });

  it("**o gráfico não desaparece às dez da noite**", () => {
    /*
     * Com a janela ancorada em UTC, 2026-10-03 menos catorze dias começa em
     * 09-20: das duas leituras só uma cabe, e um dia não é tendência — `null`,
     * gráfico nenhum.
     */
    const t = tendenciaEmBarras(serie, 14, AS_DEZ_DA_NOITE);
    expect(t).not.toBeNull();
    expect(t!.dias).toBe(2);
    expect(t!.de).toBe("2026-09-19");
  });

  it("**e o fim da janela não é amanhã na data dele**", () => {
    /*
     * `ate` é o campo com que a tela decide se escreve *"última leitura …"*.
     * Com o fim em 10-03 e o telefone em 10-02, a comparação era contra um dia
     * que ainda não começou.
     */
    const t = tendenciaEmBarras(serie, 30, AS_DEZ_DA_NOITE)!;
    expect(t.ate).toBe("2026-10-02");
    expect(t.ate).toBe(diaLocal(AS_DEZ_DA_NOITE));
  });

  it("uma leitura de hoje é reconhecida como de hoje", () => {
    const hoje = [
      { dia: "2026-10-01", valor: 60 },
      { dia: "2026-10-02", valor: 62 },
    ];
    const t = tendenciaEmBarras(hoje, 14, AS_DEZ_DA_NOITE)!;
    /* `ultimoComDado === ate` é o que faz a tela **não** escrever a linha. */
    expect(t.ultimoComDado).toBe(t.ate);
  });

  it("**e um carimbo mais recente do que hoje não encolhe a janela**", () => {
    /* A guarda do `fim` continua de pé: um dia no futuro manda nela. */
    const comFuturo = [...serie, { dia: "2026-10-05", valor: 70 }];
    const t = tendenciaEmBarras(comFuturo, 30, AS_DEZ_DA_NOITE)!;
    expect(t.ate).toBe("2026-10-05");
  });
});
