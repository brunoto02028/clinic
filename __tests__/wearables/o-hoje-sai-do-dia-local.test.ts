/**
 * @jest-environment node
 *
 * De onde sai o "hoje" da barra de meta (118 T-7).
 *
 * A barra só se desenha quando o valor é **de hoje**, e "hoje" tem de ser o dia
 * **local** da pessoa. A chave em UTC já mordeu três vezes nesta base: depois
 * da meia-noite em Londres no verão, e em qualquer fuso a leste, o dia local e
 * o `toISOString()` divergem — e a tela trata o dado de hoje como de ontem.
 *
 * Isto não se prova comparando os dois: o `jest.config.js` fixa `TZ=UTC`, e sob
 * UTC eles concordam sempre. Prova-se **trocando o módulo**: aqui o `diaLocal`
 * devolve um sentinela que nenhuma data real produziria. Se alguém voltar a
 * calcular o dia a partir de `toISOString()`, o sentinela deixa de ser lido e
 * este teste cai.
 */

jest.mock("../../mobile/src/lib/dia-e-noite-calculo", () => ({
  diaLocal: jest.fn(() => "SENTINELA-DO-DIA-LOCAL"),
}));

import { ehDeHoje } from "../../mobile/src/lib/resumo-de-saude";
import { diaLocal } from "../../mobile/src/lib/dia-e-noite-calculo";

describe("o hoje por omissão", () => {
  beforeEach(() => jest.clearAllMocks());

  it("**sai do `diaLocal`** — o módulo é chamado", () => {
    ehDeHoje("qualquer-coisa");
    expect(diaLocal).toHaveBeenCalled();
  });

  it("**e é o valor dele que decide**", () => {
    expect(ehDeHoje("SENTINELA-DO-DIA-LOCAL")).toBe(true);
    expect(ehDeHoje(new Date().toISOString().slice(0, 10))).toBe(false);
  });

  it("sem dia, desenha — e não é o `diaLocal` que decide isso", () => {
    // A página de família mostra a última leitura e não afirma nada sobre hoje.
    // O `diaLocal` ainda corre (é valor por omissão do parâmetro, avaliado
    // antes do corpo), mas a resposta não depende dele: o sentinela não entra
    // na comparação nenhuma.
    expect(ehDeHoje(undefined)).toBe(true);
    expect(ehDeHoje(null)).toBe(true);
  });
});
