/**
 * @jest-environment node
 *
 * A sondagem separa "vazio" de "sem direito" (119 T-1).
 *
 * ## O que ela existe para responder
 *
 * O app da Withings mostra HRV, respiração, SpO₂ do sono, o hipnograma e o
 * traçado do ECG. Nós não mostramos nenhum deles, e **não sabíamos porquê**:
 * dado fora do plano da API **não dá erro**, o campo só não vem. Medido em
 * produção em 01/10/2026, o hipnograma e os treinos voltaram vazios, sem erro
 * nenhum.
 *
 * "Vazio" e "sem direito" são a mesma resposta na rede e levam a acções
 * opostas — pagar um plano, ou procurar um defeito nosso que não existe.
 *
 * ## O defeito que o isolamento fecha
 *
 * Em 01/10 um `data_fields` inválido numa chamada derrubou **as três** séries
 * de uma vez, porque partilhavam um `try`. Durante horas pareceu que o plano
 * não incluía nenhuma das três — quando o que havia era um parâmetro nosso
 * errado numa delas.
 *
 * É por isso que o teste mais importante deste ficheiro é o de uma pergunta
 * falhar **sem levar as outras com ela**.
 */

jest.mock("@/lib/withings", () => ({ withingsRawCall: jest.fn() }));

import { withingsRawCall } from "@/lib/withings";
import { sondarTudo, tabelaDaSondagem, Sondagem } from "@/lib/withings-sondagem";

const chamar = withingsRawCall as jest.Mock;

/** Sem espera, senão o teste demora os 11 segundos de cada pergunta. */
const sondar = () => sondarTudo("token-de-teste", { esperaMs: 0 });

/**
 * Um corpo que satisfaz **todos** os extractores.
 *
 * Cada endpoint da Withings devolve a sua lista com um nome diferente —
 * `activities`, `measuregrps`, `series`, `signal` —, e os extractores são
 * específicos de propósito: um que lesse "a primeira lista que encontrar" diria
 * "veio" para uma resposta que trouxe outra coisa qualquer.
 */
const corpoCheio = (extra: Record<string, unknown> = {}) => ({
  activities: [{ steps: 249 }],
  measuregrps: [{ measures: [{ type: 11, value: 63 }] }],
  series: [{ qualquer: 1 }],
  signal: [1, 2, 3],
  ...extra,
});

beforeEach(() => jest.clearAllMocks());

describe("os três desfechos", () => {
  it("**veio** — com quantos e um exemplo", async () => {
    chamar.mockResolvedValue(corpoCheio({ series: [{ rmssd: 14 }, { rmssd: 18 }] }));
    const linhas = await sondar();
    const hrv = linhas.find((l) => l.biomarcador.startsWith("HRV"))!;
    expect(hrv.desfecho).toBe("veio");
    expect(hrv.quantos).toBe(2);
    expect(hrv.exemplo).toEqual({ rmssd: 14 });
  });

  it("**vazio** — e guarda as chaves do corpo, que é tudo o que há para olhar", async () => {
    // É este o caso ambíguo: respondeu bem, e não trouxe nada. Sem as chaves,
    // não há como distinguir "não há dados" de "não tens direito a estes".
    chamar.mockResolvedValue({ series: [], more: false, offset: 0 });
    const linhas = await sondar();
    const hipno = linhas.find((l) => l.biomarcador.startsWith("Hipnograma"))!;
    expect(hipno.desfecho).toBe("vazio");
    expect(hipno.quantos).toBe(0);
    expect(hipno.chaves).toEqual(["series", "more", "offset"]);
  });

  it("**erro** — com a mensagem dela, e não um vazio disfarçado", async () => {
    chamar.mockRejectedValue(new Error("Withings 601: Same arguments"));
    const linhas = await sondar();
    const treinos = linhas.find((l) => l.biomarcador === "Treinos")!;
    expect(treinos.desfecho).toBe("erro");
    expect(treinos.erro).toMatch(/601/);
  });

  it("um corpo que não é objeto não finge chaves", async () => {
    chamar.mockResolvedValue(null);
    const linhas = await sondar();
    expect(linhas.every((l) => l.desfecho !== "veio")).toBe(true);
    expect(linhas[0].chaves).toEqual([]);
  });
});

describe("uma pergunta que falha não leva as outras", () => {
  it("**é o defeito de 01/10, e é este o teste que o fixa**", async () => {
    // Nessa altura um `data_fields` inválido derrubou três séries de uma vez
    // porque partilhavam um `try`, e pareceu falta de plano.
    chamar.mockImplementation(async (caminho: string, body: any) => {
      if (caminho === "/v2/sleep" && body.action === "get") {
        throw new Error("Withings 503: Invalid Params");
      }
      if (caminho === "/v2/heart" && body.action === "list") {
        return corpoCheio({ series: [{ ecg: { signalid: 1, afib: 0 } }] });
      }
      return corpoCheio();
    });

    const linhas = await sondar();
    const hipno = linhas.find((l) => l.biomarcador.startsWith("Hipnograma"))!;
    expect(hipno.desfecho).toBe("erro");

    /*
     * Todas as outras continuaram a ser feitas, e **nenhuma herdou o erro**.
     * Em 01/10 era isto que acontecia: uma falhava e as vizinhas apareciam
     * como se também não tivessem direito.
     */
    const outras = linhas.filter((l) => l !== hipno);
    expect(outras.length).toBeGreaterThan(5);
    expect(outras.some((l) => l.desfecho === "erro")).toBe(false);
    expect(outras.every((l) => l.desfecho === "veio")).toBe(true);
  });

  it("e a primeira a falhar não impede a última", async () => {
    let n = 0;
    chamar.mockImplementation(async (caminho: string, body: any) => {
      n++;
      if (n === 1) throw new Error("caiu logo a primeira");
      if (caminho === "/v2/heart" && body.action === "list") {
        return corpoCheio({ series: [{ ecg: { signalid: 42, afib: 0 } }] });
      }
      return corpoCheio();
    });
    const linhas = await sondar();
    expect(linhas[0].desfecho).toBe("erro");
    expect(linhas[linhas.length - 1].desfecho).toBe("veio");
  });
});

describe("o que ela pergunta", () => {
  it("**pergunta por tudo o que o app deles mostra e o nosso não**", async () => {
    chamar.mockResolvedValue({ series: [] });
    const linhas = await sondar();
    const nomes = linhas.map((l) => l.biomarcador).join(" | ");
    expect(nomes).toMatch(/HRV/);
    expect(nomes).toMatch(/respiração/i);
    expect(nomes).toMatch(/Hipnograma/);
    expect(nomes).toMatch(/ECG — o traçado/);
    expect(nomes).toMatch(/Treinos/);
  });

  it("e leva um **controlo positivo** — o que já sabemos que chega", async () => {
    // Sem ele, uma sondagem toda a "vazio" não distingue "o plano não inclui
    // nada" de "o token morreu" ou "o paciente não usou o relógio".
    chamar.mockResolvedValue({ series: [] });
    const linhas = await sondar();
    const nomes = linhas.map((l) => l.biomarcador).join(" | ");
    expect(nomes).toMatch(/Passos/);
    expect(nomes).toMatch(/Medições pontuais/);
    expect(nomes).toMatch(/Frequência minuto a minuto/);
  });

  it("**pede o traçado com o `signalid` que a lista deu**", async () => {
    chamar.mockImplementation(async (caminho: string, body: any) => {
      if (caminho === "/v2/heart" && body.action === "list") {
        return corpoCheio({ series: [{ ecg: { signalid: 557124430, afib: 0 }, heart_rate: 63 }] });
      }
      return corpoCheio();
    });
    await sondar();
    const pedido = chamar.mock.calls.find(
      (c) => c[0] === "/v2/heart" && c[1].action === "get"
    );
    expect(pedido).toBeDefined();
    expect(pedido![1].signalid).toBe("557124430");
  });

  it("**sem `signalid` não inventa um pedido**", async () => {
    chamar.mockResolvedValue({ series: [] });
    await sondar();
    const pedido = chamar.mock.calls.find(
      (c) => c[0] === "/v2/heart" && c[1].action === "get"
    );
    expect(pedido).toBeUndefined();
  });

  it("todas as perguntas levam o token", async () => {
    chamar.mockResolvedValue(corpoCheio({ series: [{ ecg: { signalid: 7 } }] }));
    await sondar();
    for (const c of chamar.mock.calls) {
      expect(c[1].access_token).toBe("token-de-teste");
    }
  });

  it("**nenhuma pergunta é repetida com os mesmos argumentos**", async () => {
    // Argumentos iguais em menos de dez segundos dão `601` — que é dedupe, não
    // falta de direito. Um `601` lido como "não tenho acesso" seria a conclusão
    // errada pela razão errada.
    chamar.mockResolvedValue(corpoCheio({ series: [{ ecg: { signalid: 7 } }] }));
    await sondar();
    const assinaturas = chamar.mock.calls.map((c) => JSON.stringify([c[0], c[1]]));
    expect(new Set(assinaturas).size).toBe(assinaturas.length);
  });
});

describe("a tabela que vai para o log", () => {
  const linha = (over: Partial<Sondagem>): Sondagem => ({
    biomarcador: "X",
    chamada: "/v2/x#get",
    desfecho: "veio",
    ...over,
  });

  it("marca os três desfechos de forma distinguível", () => {
    const t = tabelaDaSondagem([
      linha({ biomarcador: "A", desfecho: "veio", quantos: 3 }),
      linha({ biomarcador: "B", desfecho: "vazio", chaves: ["series"] }),
      linha({ biomarcador: "C", desfecho: "erro", erro: "503" }),
    ]);
    expect(t).toMatch(/OK\s+A .* 3 valores/);
    expect(t).toMatch(/VAZIO B .* chaves do corpo: series/);
    expect(t).toMatch(/ERRO\s+C .* 503/);
  });

  it("**um vazio sem chaves nenhumas diz isso**, em vez de uma linha muda", () => {
    const t = tabelaDaSondagem([linha({ desfecho: "vazio", chaves: [] })]);
    expect(t).toMatch(/nenhuma/);
  });
});

describe("a sondagem não escreve", () => {
  it("**não importa o prisma** — medir não pode alterar o que se mede", () => {
    const fs = require("fs");
    const path = require("path");
    const src: string = fs.readFileSync(
      path.join(__dirname, "..", "..", "lib", "withings-sondagem.ts"),
      "utf8"
    );
    const semComentarios = src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/.*$/gm, "$1 ");
    expect(semComentarios).not.toMatch(/from "@\/lib\/db"/);
    expect(semComentarios).not.toMatch(/prisma\./);
    expect(semComentarios).not.toMatch(/upsert|create\(|update\(/);
  });
});
