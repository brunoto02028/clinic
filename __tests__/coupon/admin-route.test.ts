/**
 * @jest-environment node
 *
 * A tela e a API do cupom no painel (084, T-2).
 *
 * O que estes testes protegem é o que já quebrou antes:
 *
 *   - **Quem pode.** `/admin/service-pricing` é superadmin-only, mas a rota de
 *     preço por paciente autorizava ADMIN — a tela dizia uma coisa e a rota
 *     outra (F1 do QA da 082).
 *   - **O tenant.** Sempre pelo actor, nunca por header. Foi assim que as notas
 *     SOAP vazaram (1b4109a5).
 *   - **O interruptor salvando na hora.** Na tela de preços ele só mudava o
 *     estado local: o Bruno desligava e nada acontecia (26/09/2026).
 */

import fs from "fs";
import path from "path";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");

/**
 * O código, sem os comentários.
 *
 * Necessário porque as rotas **citam** `session.user.clinicId` para explicar o
 * que não se faz — e um teste que proíbe a string reprovaria justamente o
 * arquivo que documenta o cuidado.
 */
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const lista = ler("app", "api", "admin", "coupons", "route.ts");
const item = ler("app", "api", "admin", "coupons", "[id]", "route.ts");
const resgates = ler("app", "api", "admin", "coupons", "[id]", "redemptions", "route.ts");
const tela = ler("app", "admin", "coupons", "page.tsx");

describe("só o dono administra cupom", () => {
  it.each([
    ["lista/criação", lista],
    ["edição/exclusão", item],
    ["resgates", resgates],
  ])("%s exige SUPERADMIN", (_nome, src) => {
    expect(src).toMatch(/role !== "SUPERADMIN"/);
  });

  it("a tela vive atrás da mesma guarda de rota", () => {
    expect(ler("lib", "superadmin-routes.ts")).toContain('"/admin/coupons"');
  });

  it("nenhuma das rotas aceita ADMIN — foi a divergência da F1 da 082", () => {
    for (const src of [lista, item, resgates]) {
      expect(src).not.toMatch(/role === "ADMIN"/);
    }
  });
});

describe("o tenant vem do actor", () => {
  it.each([
    ["lista/criação", lista],
    ["edição/exclusão", item],
    ["resgates", resgates],
  ])("%s usa getSessionStaffActor", (_nome, src) => {
    const codigo = semComentarios(src);
    expect(codigo).toContain("getSessionStaffActor");
    expect(codigo).not.toMatch(/session\.user\.clinicId/);
    expect(codigo).not.toMatch(/headers\.get\("x-clinic/);
  });

  it("a edição acha o cupom pelo par id+clinicId, nunca só pelo id", () => {
    expect(item).toMatch(/findFirst\(\{\s*where:\s*\{\s*id:\s*params\.id,\s*clinicId\s*\}/);
  });

  it("os resgates só saem depois de o cupom ser confirmado como desta clínica", () => {
    const iCupom = resgates.indexOf("coupon.findFirst");
    const iResgates = resgates.indexOf("couponRedemption.findMany");
    expect(iCupom).toBeGreaterThan(-1);
    expect(iResgates).toBeGreaterThan(iCupom);
  });

  it("mirar num paciente confere que ele é desta clínica", () => {
    for (const src of [lista, item]) {
      expect(src).toMatch(/findFirst\(\{\s*\n?\s*where:\s*\{\s*id:\s*String\(body\.patientId\),\s*clinicId,\s*role:\s*"PATIENT"/);
    }
  });
});

describe("o que a tela promete, a rota cumpre", () => {
  it("código repetido responde com frase, não com erro de banco", () => {
    expect(lista).toContain("already exists here");
    expect(lista).toMatch(/findUnique\(\{ where: \{ clinicId_code/);
  });

  it("cupom já cobrado é desativado, não apagado", () => {
    expect(item).toMatch(/confirmedAt: \{ not: null \}/);
    expect(item).toContain("deactivated: true");
  });

  it("e a tela avisa isso **antes** de confirmar", () => {
    expect(tela).toContain("switched off instead of deleted");
  });

  it("o interruptor salva na hora e volta ao que o servidor respondeu", () => {
    expect(tela).toMatch(/const alternar = async/);
    expect(tela).toMatch(/method: "PATCH"/);
    // Reverte no erro: sem isto a tela mostraria ligado com o banco desligado.
    expect(tela).toMatch(/isActive: !isActive/);
  });

  it("o PATCH aceita o interruptor sozinho, sem exigir o formulário todo", () => {
    expect(item).toContain("soOInterruptor");
  });

  it("toda escrita é auditada", () => {
    expect(lista).toContain("COUPON_CREATED");
    expect(item).toContain("COUPON_UPDATED");
    expect(item).toContain("COUPON_ENABLED");
    expect(item).toContain("COUPON_DISABLED");
    expect(item).toContain("COUPON_DELETED");
  });
});

describe("o exame não é oferecido, e a ausência é explicada", () => {
  it("a lista de alcances da tela não tem exame", () => {
    const bloco = tela.slice(tela.indexOf("const ESCOPOS"), tela.indexOf("interface Coupon"));
    // Pelas chaves, não pelo texto: "label" contém "LAB".
    const chaves = [...bloco.matchAll(/key: "([A-Z_]+)"/g)].map((m) => m[1]);
    expect(chaves).toEqual(["CONSULTATION", "TREATMENT_SESSION", "PACKAGE", "TREATMENT_PLAN", "MEMBERSHIP"]);
    expect(bloco).not.toMatch(/LAB_TEST/);
    expect(bloco).not.toMatch(/blood|exam/i);
  });

  it("e a tela diz por que o exame não está lá", () => {
    expect(tela).toContain("Lab tests are not on this list, on purpose");
    expect(tela).toMatch(/margin/);
  });
});

describe("a navegação leva até lá", () => {
  it("o cupom aparece no menu do admin, marcado como superadmin", () => {
    const secoes = ler("lib", "admin-sections.ts");
    const i = secoes.indexOf('key: "coupons"');
    expect(i).toBeGreaterThan(-1);
    expect(secoes.slice(i, i + 400)).toContain("superadminOnly: true");
    expect(secoes).toContain('"/admin/coupons"');
  });
});
