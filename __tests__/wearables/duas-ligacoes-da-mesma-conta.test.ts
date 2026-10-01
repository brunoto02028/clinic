/**
 * @jest-environment node
 *
 * Duas ligações da mesma conta Withings não podem falar ao mesmo tempo
 * (114 / 099 T-7).
 *
 * ## O defeito, medido em produção
 *
 * Em 01/10/2026 a sincronização de produção devolvia, em todas as rodadas:
 *
 *     connections=2 synced=1 withData=1 failed=1
 *     connection cmufr3e58001b…: Withings status 601: Same arguments in less than 10 seconds
 *
 * `601` não é limite de quantidade — é **dedupe**: a mesma chamada, com os
 * mesmos argumentos, dentro de dez segundos. A braçadeira da clínica e o
 * relógio estão na **mesma conta Withings**, e o laço sincronizava uma a seguir
 * à outra com a mesma janela de datas.
 *
 * ## Porque isso não era cosmético
 *
 * A ligação da clínica é a **única autorizada a ler pressão** — a pessoal
 * cala-se de propósito, para uma leitura feita num paciente não ser gravada no
 * prontuário de quem carrega o aparelho. Então o `601` dela significava que a
 * pressão medida **não chegava a ninguém**.
 *
 * E o sintoma enganava: na mesma rodada, a chamada de vitais via as medições
 * (`tipos de medida sem nome: 9×3, 10×3` — diastólica e sistólica, três vezes)
 * enquanto o total de pressão dizia `0`. O dado estava lá e era saltado.
 */

import * as fs from "fs";
import * as path from "path";

const ROTA = path.join(
  __dirname, "..", "..", "app", "api", "cron", "wearables-sync", "route.ts"
);

/** O código sem comentários — eles explicam o defeito e citam os números. */
function codigo(): string {
  return fs
    .readFileSync(ROTA, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith("//") && !s.startsWith("*");
    })
    .join("\n");
}

describe("a rodada espera entre ligações da mesma conta", () => {
  it("a varredura lê a rota de verdade — senão aprova o vazio", () => {
    expect(codigo().length).toBeGreaterThan(3000);
  });

  it("**o intervalo é maior que os dez segundos da Withings**", () => {
    const src = codigo();
    const m = src.match(/INTERVALO_MINIMO_POR_CONTA_MS\s*=\s*([\d_]+)/);
    expect(m).not.toBeNull();
    const ms = Number(m![1].replace(/_/g, ""));
    // Dez segundos exatos não chegam: a janela deles é "menos de 10 segundos",
    // e a margem tem de cobrir o relógio das duas pontas.
    expect(ms).toBeGreaterThan(10_000);
  });

  it("**a espera é por conta, não por ligação**", () => {
    // Dormir entre ligações de contas diferentes gastaria o orçamento da rodada
    // sem motivo: o dedupe é do lado deles e é por conta.
    const src = codigo();
    expect(src).toMatch(/esperarAVezDaConta\([\s\S]{0,80}providerUserId/);
    expect(src).toMatch(/ultimaChamadaPorConta/);
  });

  it("**a espera cobre todas as chamadas da rodada, não só a ingestão**", () => {
    // A primeira versão espaçava só `ingestWithings`, e o 601 continuou em
    // produção: a confirmação de subscrição é outra chamada à mesma conta e
    // gastava a janela antes de a ingestão chegar. Espaçar metade das chamadas
    // é não espaçar.
    const src = codigo();
    const esperas = src.match(/esperarAVezDaConta\(/g) ?? [];
    expect(esperas.length).toBeGreaterThanOrEqual(2);

    const iSub = src.indexOf("await subscribeAndRecord(");
    const iIng = src.indexOf("await ingestWithings(");
    expect(iSub).toBeGreaterThan(0);
    expect(iIng).toBeGreaterThan(0);
    // Cada uma tem uma espera antes de si.
    expect(src.lastIndexOf("esperarAVezDaConta(", iSub)).toBeGreaterThan(0);
    expect(src.lastIndexOf("esperarAVezDaConta(", iIng)).toBeGreaterThan(0);
  });

  it("a espera acontece **antes** da chamada, não depois", () => {
    const src = codigo();
    const iEspera = src.indexOf("esperarAVezDaConta(ultimaChamadaPorConta");
    const iChamada = src.indexOf("await ingestWithings(");
    expect(iEspera).toBeGreaterThan(0);
    expect(iChamada).toBeGreaterThan(iEspera);
  });

  it("uma ligação sem conta conhecida não bloqueia a rodada", () => {
    // `providerUserId` é opcional no modelo. Esperar por `null` faria todas as
    // ligações sem conta esperarem umas pelas outras sem razão.
    expect(codigo()).toMatch(/if \(!conta\) return 0;/);
  });

  it("a consulta traz o `providerUserId`, senão a espera nunca dispara", () => {
    // O defeito silencioso deste conserto: a função existe, o laço chama-a, e
    // o campo vem `undefined` porque o `select` não o pediu.
    expect(codigo()).toMatch(/providerUserId: true/);
  });
});
