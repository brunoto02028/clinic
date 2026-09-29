/**
 * @jest-environment node
 *
 * O corte que não parte palavra (107 T-1).
 *
 * Na lista de Education lia-se *"History is full of treatments that doctor…"* —
 * `numberOfLines` corta onde o pixel acaba, e isso cai no meio da palavra.
 */
import { cortarEmPalavra } from "../../mobile/src/lib/cortar-em-palavra";

describe("cortar sem partir palavra", () => {
  it("texto curto passa inteiro, sem reticência", () => {
    expect(cortarEmPalavra("Dor lombar", 40)).toBe("Dor lombar");
  });

  it("**não parte a palavra**", () => {
    const r = cortarEmPalavra("History is full of treatments that doctors once agreed on", 38);
    expect(r.endsWith("…")).toBe(true);
    expect(r).not.toMatch(/doctor…/);
    // o que sobrou são palavras inteiras
    for (const p of r.replace("…", "").split(" ")) expect(p.length).toBeGreaterThan(0);
    expect("History is full of treatments that doctors once agreed on").toContain(r.replace("…", ""));
  });

  it("no limite exato não corta nada", () => {
    const t = "1234567890";
    expect(cortarEmPalavra(t, 10)).toBe(t);
  });

  it("uma palavra maior que o limite ainda é cortada — devolver a linha toda é pior", () => {
    const r = cortarEmPalavra("Pseudopseudohipoparatireoidismo", 10);
    expect(r).toBe("Pseudopseu…");
  });

  it("não deixa pontuação solta antes da reticência", () => {
    expect(cortarEmPalavra("Carga progressiva, dor e sono", 18)).toBe("Carga progressiva…");
  });

  it("vazio, nulo e indefinido devolvem vazio", () => {
    expect(cortarEmPalavra("", 10)).toBe("");
    expect(cortarEmPalavra(null, 10)).toBe("");
    expect(cortarEmPalavra(undefined, 10)).toBe("");
  });

  it("espaço em volta não conta como conteúdo", () => {
    expect(cortarEmPalavra("   Dor lombar   ", 40)).toBe("Dor lombar");
  });
});
