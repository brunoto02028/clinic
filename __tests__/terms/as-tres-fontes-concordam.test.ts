/**
 * @jest-environment node
 *
 * Os termos, o consentimento e a ficha da Apple dizem a mesma coisa (091 T-6).
 *
 * Três textos descrevem a mesma regra de idade, e cada um mora num lugar:
 *
 * - `lib/terms-content.ts` — o que a pessoa aceita ao criar conta;
 * - `lib/lab-consent.ts` — o que ela aceita antes de comprar um exame;
 * - `specs/090-pronto-para-a-apple/` — o que vamos declarar à Apple.
 *
 * **Três cópias da mesma regra divergem na primeira edição**, e a que fica para
 * trás é sempre a que ninguém lembra de abrir. Foi exatamente o que aconteceu
 * até ontem: o catálogo marcava dez exames como 16+, e os outros dois textos
 * diziam que *todos* eram. Este arquivo existe para a próxima divergência
 * reprovar um teste em vez de chegar ao revisor da Apple.
 */

import fs from "fs";
import path from "path";
import { labConsentFor } from "@/lib/lab-consent";
import { SECOES_DOS_TERMOS } from "@/lib/terms-content";
import { HOME_KITS } from "@/lib/lab-catalog";

const raiz = path.join(__dirname, "..", "..");
const spec = (nome: string) =>
  fs.readFileSync(path.join(raiz, "specs", "090-pronto-para-a-apple", nome), "utf8");

const todosOsItens = SECOES_DOS_TERMOS.flatMap((s) => s.itens);
const termosEn = todosOsItens.map((i) => i.corpo.en).join(" ");
const termosPt = todosOsItens.map((i) => i.corpo.pt).join(" ");

describe("a regra geral dos 16 anos não existe em lugar nenhum", () => {
  it("nos termos", () => {
    expect(termosEn).not.toMatch(/Tests are for people aged 16 or over/);
    expect(termosPt).not.toMatch(/Exames são para maiores de 16 anos/);
  });

  it("no consentimento, nas duas línguas e nas duas vozes", () => {
    for (const loc of ["en-GB", "pt-BR"] as const) {
      for (const nome of [undefined, "Ana"]) {
        const t = labConsentFor(loc, nome).points.join(" ");
        expect(t).not.toMatch(/Laboratory tests are for people aged 16 or over/);
        expect(t).not.toMatch(/Exames de laboratório são para maiores de 16 anos/);
      }
    }
  });

  it("e a ficha da Apple registra que ela caiu, em vez de fingir que nunca existiu", () => {
    // Uma decisão revertida em silêncio é uma decisão que volta.
    expect(spec("categoria-e-classificacao.md")).toMatch(/Essa regra não existe\s*\n?mais/);
  });
});

describe("o 16 que sobrou é o da conta, e os três textos concordam", () => {
  it("os termos dizem que ter conta é 16+", () => {
    expect(termosEn).toMatch(/Holding an account here is for people aged 16 or over/);
    expect(termosPt).toMatch(/Ter conta aqui é para maiores de 16 anos/);
  });

  it("a ficha da Apple apoia a classificação nisso, e não no exame", () => {
    const doc = spec("categoria-e-classificacao.md");
    expect(doc).toMatch(/quem pode ter conta/);
    expect(doc).toMatch(/16\+/);
  });

  it("e o app segue sendo 16+, não 4+", () => {
    expect(spec("categoria-e-classificacao.md")).not.toMatch(/Classificação etária: \*\*4\+\*\*/);
  });
});

describe("o 16 por exame é o do catálogo, e os textos apontam para ele", () => {
  it("o catálogo marca hormônios e saúde sexual, e só eles", () => {
    const marcados = HOME_KITS.filter((k) => k.notUnder16);
    expect(marcados.length).toBeGreaterThan(0);
    for (const k of marcados) {
      expect(k.category).toMatch(/Hormones|Sexual health/);
    }
    // E o resto do catálogo não é 16+ — que era a suposição que caiu.
    expect(marcados.length).toBeLessThan(HOME_KITS.length);
  });

  it("os termos mandam a pessoa à página do exame, que é quem sabe", () => {
    expect(termosEn).toMatch(/each test page says so before you pay/);
    expect(termosPt).toMatch(/a página de cada exame diz isso antes de você pagar/);
  });

  it("e o consentimento diz o mesmo", () => {
    expect(labConsentFor("en-GB").points.join(" ")).toMatch(/each test page says so before you pay/);
    expect(labConsentFor("pt-BR").points.join(" ")).toMatch(/a página de cada exame diz isso antes de você pagar/);
  });
});

describe("a regra do menor de idade está nos três", () => {
  it("nos termos, com o caminho de como se faz", () => {
    expect(termosEn).toMatch(/Anyone under 18 is ordered for, and consented for, by whoever is responsible for them/);
    expect(termosEn).toMatch(/the test is issued in their name, and the result comes to you/);
    expect(termosPt).toMatch(/Quem tem menos de 18 anos é sempre pedido, e consentido, por quem responde por ele/);
  });

  it("no consentimento, na voz de quem está pedindo", () => {
    expect(labConsentFor("en-GB", "Ana").points.join(" ")).toMatch(
      /ordered for by whoever is responsible for them — which is what you are doing here/
    );
  });

  it("e a ficha da Apple explica por que isso não derruba o 16+", () => {
    expect(spec("categoria-e-classificacao.md")).toMatch(/A criança não usa o app/);
  });
});

describe("e a versão subiu nos dois textos que a pessoa aceita", () => {
  it("**as duas constantes andam juntas**", () => {
    // São dois números para o mesmo texto, sincronizados à mão:
    // `TERMS_VERSION` é o que vai para o ConsentLog, `TERMS_CONTENT_VERSION` é
    // o que `/api/terms` devolve. Nada impedia uma subir e a outra ficar —
    // e aí o registro de aceite apontaria para um texto que não é o que a
    // pessoa leu. Achado do review de 27/09/2026.
    const { TERMS_VERSION } = require("@/lib/terms-version");
    const { TERMS_CONTENT_VERSION } = require("@/lib/terms-content");
    expect(TERMS_VERSION).toBe(TERMS_CONTENT_VERSION);
  });

  it("os termos", () => {
    expect(fs.readFileSync(path.join(raiz, "lib", "terms-version.ts"), "utf8")).toMatch(
      /TERMS_VERSION = "1\.2"/
    );
  });

  it("o consentimento do laboratório", () => {
    expect(fs.readFileSync(path.join(raiz, "lib", "lab-consent.ts"), "utf8")).toMatch(
      /LAB_TESTS_CONSENT_VERSION = "1\.2"/
    );
  });
});
