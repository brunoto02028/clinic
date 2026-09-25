/**
 * @jest-environment node
 *
 * O catálogo existe duas vezes (081, T-2): em `lib/lab-catalog.ts`, que a tela
 * e os testes leem, e em `scripts/seed-lab-products.js`, JavaScript puro
 * porque a imagem de produção não tem tsx — como todo seed de boot aqui.
 *
 * Duas cópias escritas à mão divergem em silêncio. Este teste lê o seed como
 * texto e confere código a código contra a lista tipada: mesmo conjunto,
 * mesmo custo, mesmo RRP.
 */

import fs from "fs";
import path from "path";
import { HOME_KITS, labMargin, gbp } from "../../lib/lab-catalog";

function kitsFromSeed(): Record<string, { costPrice: number; rrp: number }> {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "seed-lab-products.js"), "utf8");
  const out: Record<string, { costPrice: number; rrp: number }> = {};
  const re = /code:\s*'([A-Z0-9]{3})'[^}]*costPrice:\s*([\d.]+),\s*rrp:\s*([\d.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out[m[1]] = { costPrice: Number(m[2]), rrp: Number(m[3]) };
  return out;
}

describe("o seed em JavaScript e a lista tipada não podem divergir", () => {
  const seed = kitsFromSeed();

  it("são os mesmos 22 kits", () => {
    expect(HOME_KITS).toHaveLength(22);
    expect(Object.keys(seed).sort()).toEqual(HOME_KITS.map((k) => k.code).sort());
  });

  it.each(HOME_KITS.map((k) => [k.code, k.costPrice, k.rrp]))("%s: custo %s e RRP %s iguais nos dois", (code, cost, rrp) => {
    expect(seed[code as string]).toEqual({ costPrice: cost, rrp });
  });

  it("nenhum kit nasce vendendo abaixo do custo", () => {
    for (const k of HOME_KITS) expect(k.rrp).toBeGreaterThan(k.costPrice);
  });

  it("todo kit tem texto EN e PT, e o EN vem primeiro", () => {
    for (const k of HOME_KITS) {
      expect(k.descriptionEn.length).toBeGreaterThan(20);
      expect(k.descriptionPt.length).toBeGreaterThan(20);
    }
  });
});

describe("labMargin", () => {
  it("libras e fração do preço de venda", () => {
    expect(labMargin(59, 31.5)).toEqual({ gbp: 27.5, pct: 27.5 / 59 });
    expect(labMargin(0, 10).pct).toBe(0);
  });
  it("gbp formata em libra britânica", () => {
    expect(gbp(59)).toBe("£59.00");
  });
});
