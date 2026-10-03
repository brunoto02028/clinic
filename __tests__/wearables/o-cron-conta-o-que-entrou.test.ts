/**
 * @jest-environment node
 *
 * O resultado da sincronização conta **tudo** o que entrou.
 *
 * ## Porque isto é um teste e não um detalhe
 *
 * O contador de ECG existia dentro da ingestão e **não subia até ao resultado
 * do cron**. Em 02/10/2026 disparei uma sincronização em produção com um único
 * objectivo — recuperar um ECG perdido — e o resultado veio assim:
 *
 * ```
 * {"synced":1,"totals":{"bloodPressure":0,"activityDays":2,"sleepNights":1,
 *  "vitalsDays":2,"intradayDays":2,"hypnogramNights":2,"workouts":0}}
 * ```
 *
 * Sem `ecgRecords`. Fiquei **cego no único número que me interessava**, e tive
 * de ir ao log do contentor para saber se tinha funcionado.
 *
 * É a segunda vez que esta omissão morde nesta rota: em 01/10 os contadores de
 * intraday, hipnograma e treinos tinham sido acrescentados à ingestão e não aos
 * totais, pelo mesmo motivo e com o mesmo efeito.
 *
 * ## O que este teste fixa
 *
 * Que **todo contador que a ingestão produz aparece no resultado**. Não a lista
 * de nomes de hoje — a regra. Um contador novo que alguém acrescente à ingestão
 * e esqueça aqui faz este teste cair, que é exactamente o que faltou das duas
 * vezes.
 */

import fs from "fs";
import path from "path";

const lerCodigo = (...p: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");

const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1 ");

describe("os contadores da ingestão chegam ao resultado do cron", () => {
  const ingest = semComentarios(lerCodigo("lib", "withings-ingest.ts"));
  const cron = semComentarios(
    lerCodigo("lib", "wearables-sync-run.ts")
  );

  /**
   * Os nomes que a ingestão devolve, lidos da interface dela.
   *
   * Lê-se a **forma do retorno**, não uma lista escrita à mão aqui: uma lista
   * minha envelhecia no dia em que alguém acrescentasse um contador, que é
   * precisamente o caso que este ficheiro existe para apanhar.
   */
  const camposDaIngestao = (): Array<{ nome: string; tipo: string }> => {
    const bloco = /export interface IngestCounts \{([\s\S]*?)\n\}/.exec(ingest);
    if (!bloco) throw new Error("não achei a interface dos contadores na ingestão");
    return [...bloco[1].matchAll(/^\s*(\w+)\??\s*:\s*([^;]+);/gm)].map((m) => ({
      nome: m[1],
      tipo: m[2].trim(),
    }));
  };

  /**
   * Os **contadores**: os campos numéricos.
   *
   * A interface deixou de ser só contadores em 02/10 — ganhou `falhas: string[]`
   * (120 T-4), que é uma lista do que **não** se conseguiu ler. Uma lista não se
   * soma, logo a regra do `+=` não lhe serve; mas ela tem de aparecer no
   * resultado e no log pelo mesmo motivo que os contadores, e isso tem o seu
   * próprio teste abaixo.
   */
  const contadoresDaIngestao = (): string[] =>
    camposDaIngestao()
      .filter((c) => c.tipo === "number")
      .map((c) => c.nome);

  /** O que não é número: tem de chegar ao resultado por outro caminho. */
  const listasDaIngestao = (): string[] =>
    camposDaIngestao()
      .filter((c) => c.tipo !== "number")
      .map((c) => c.nome);

  it("a ingestão declara contadores", () => {
    const nomes = contadoresDaIngestao();
    expect(nomes.length).toBeGreaterThan(4);
    expect(nomes).toContain("ecgRecords");
  });

  it("**cada contador da ingestão é somado nos totais do cron**", () => {
    const faltam = contadoresDaIngestao().filter(
      (nome) => !new RegExp(`totals\\.${nome}\\s*\\+=`).test(cron)
    );
    expect(faltam).toEqual([]);
  });

  it("**e cada um aparece na linha de log**, que é por onde se lê em produção", () => {
    /*
     * O JSON da resposta só se vê quem chamou a rota. Quem abre o log do
     * contentor — que foi como eu descobri que o ECG tinha entrado — lê a
     * linha de resumo, e um contador que não esteja lá continua invisível.
     */
    /*
     * A instrução inteira, e não até ao primeiro backtick: a linha passou a
     * ser concatenada em vários pedaços, e um regex que parasse no primeiro
     * diria que faltam contadores que estão lá. O teste era frágil pela mesma
     * razão que o código era cego.
     */
    /*
     * Ancorado em `connections=`, que só a linha de resumo tem. Procurar por
     * `[cron/wearables-sync]` encontrava primeiro o `console.error` do aviso,
     * umas linhas acima, e media a instrução errada — um teste a falhar por
     * estar a olhar para o sítio errado é pior do que um teste a não existir.
     */
    const i = cron.indexOf("connections=${connections.length}");
    const fim = cron.indexOf(");", i);
    const linha = i < 0 ? "" : cron.slice(i, fim < 0 ? undefined : fim);
    const faltam = contadoresDaIngestao().filter(
      (nome) => !linha.includes(`totals.${nome}`)
    );
    expect(faltam).toEqual([]);
  });

  /**
   * **E o que não é contador também chega** (120 T-4).
   *
   * `falhas` é a lista do que não se conseguiu ler. Se ela ficar na ingestão e
   * não subir ao cron, voltamos ao estado em que um `ecg=0` nos totais era as
   * duas coisas — *"não gravou"* e *"não conseguimos ler"* — que é o defeito
   * para que ela nasceu.
   */
  it("**e o que não é contador — a lista do que falhou — também sobe**", () => {
    const listas = listasDaIngestao();
    /* Se a interface voltar a ser só números, este teste não tem o que medir. */
    expect(listas).toContain("falhas");

    for (const nome of listas) {
      /* Acumulado no cron… */
      expect(cron).toMatch(new RegExp(`totals\\.${nome}\\.add\\(`));
      /* …escrito no log… */
      const i = cron.indexOf("connections=${connections.length}");
      const fim = cron.indexOf(");", i);
      expect(cron.slice(i, fim)).toContain(`totals.${nome}`);
      /* …e na resposta, como lista e não como `{}`. */
      expect(cron).toMatch(new RegExp(`${nome}:\\s*\\[\\.\\.\\.totals\\.${nome}\\]`));
    }
  });
});
