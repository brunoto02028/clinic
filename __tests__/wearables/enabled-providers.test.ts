/**
 * @jest-environment node
 *
 * A lista de provedores existe **duas vezes**: em `lib/open-wearables.ts`, que
 * o servidor usa para decidir, e em `mobile/src/api/wearables.ts`, que o app
 * usa para desenhar. O app não compartilha código com a web, então as duas são
 * escritas à mão — e é aí que mora o defeito que ninguém vê num teste normal:
 *
 *   app diz `polar: enabled` · servidor diz `polar: disabled`
 *   → o paciente vê o botão, toca, e leva 503.
 *
 * Que foi exatamente o problema que esta atividade corrigiu, só que por outro
 * caminho: seis botões oferecidos por uma tela cuja credencial nunca existiu.
 * Quando o Bruno providenciar a API de um deles, vai ligar o interruptor — e
 * este teste é o que garante que ele ligue **nos dois lugares**.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { OW_PROVIDERS, ENABLED_PROVIDERS, providerEnabled } from "../../lib/open-wearables";

/** Lê os pares `key: enabled` de um arquivo, como texto: o app não é importável daqui. */
function flagsFromSource(relPath: string): Record<string, boolean> {
  const src = readFileSync(join(__dirname, "..", "..", relPath), "utf8");
  const flags: Record<string, boolean> = {};
  const linha = /\{\s*key:\s*['"]([a-z]+)['"][^}]*enabled:\s*(true|false)\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = linha.exec(src))) flags[m[1]] = m[2] === "true";
  return flags;
}

describe("a lista do app e a do servidor não podem divergir", () => {
  const doApp = flagsFromSource("mobile/src/api/wearables.ts");

  it("o app lista os sete provedores, com o flag escrito", () => {
    expect(Object.keys(doApp).sort()).toEqual(OW_PROVIDERS.map((p) => p.key).slice().sort());
  });

  it.each(OW_PROVIDERS.map((p) => [p.key, p.enabled]))(
    "%s: o app oferece exatamente o que o servidor aceita",
    (key, enabled) => {
      expect(doApp[key as string]).toBe(enabled);
    }
  );
});

describe("o que está ligado hoje", () => {
  it("só a Withings — as outras seis esperam a API ser providenciada", () => {
    expect(ENABLED_PROVIDERS.map((p) => p.key)).toEqual(["withings"]);
  });

  it("providerEnabled recusa provedor desligado e desconhecido", () => {
    expect(providerEnabled("withings")).toBe(true);
    expect(providerEnabled("WITHINGS")).toBe(true);
    expect(providerEnabled("garmin")).toBe(false);
    expect(providerEnabled("strava")).toBe(false);
    expect(providerEnabled("nao-existe")).toBe(false);
  });
});
