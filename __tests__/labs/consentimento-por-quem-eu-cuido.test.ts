/**
 * @jest-environment node
 *
 * Consentir por quem você cuida (091 T-4).
 *
 * O Bruno, 27/09: *"os exames podem ser feitos em todas as idades, porém,
 * crianças e adolescentes menor de idade sempre acompanhados com os pais. São
 * os pais que pedem para os filhos."*
 *
 * O texto anterior estava escrito **inteiro na segunda pessoa** — "o resultado
 * é **seu**", "a coleta é **sua**", "a LML recebe **seu** nome". Quando a mãe
 * pede para a filha, não era só a linha da idade que ficava errada: eram cinco
 * cláusulas. **Consentimento que se contradiz não é consentimento**, e é isso
 * que este arquivo guarda.
 */

import { NextRequest } from "next/server";
import { ler } from "../helpers/codigo";
import { labConsentFor, LAB_TESTS_CONSENT_VERSION } from "@/lib/lab-consent";

const findFirst = jest.fn();
const consentFindFirst = jest.fn();
const consentCreate = jest.fn();
let sessao: { userId: string; isImpersonating?: boolean } | null = { userId: "mae-1" };

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findFirst: (...a: any[]) => findFirst(...a) },
    consentLog: {
      findFirst: (...a: any[]) => consentFindFirst(...a),
      create: (...a: any[]) => consentCreate(...a),
    },
  },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: async () => sessao }));

import { GET, POST } from "@/app/api/patient/lab-consent/route";

const url = (q = "") => new NextRequest(`http://local/api/patient/lab-consent${q}`, { method: "POST" });

beforeEach(() => {
  jest.clearAllMocks();
  sessao = { userId: "mae-1" };
  consentFindFirst.mockResolvedValue(null);
  consentCreate.mockResolvedValue({ createdAt: new Date() });
  findFirst.mockResolvedValue({ id: "filha-1", firstName: "Ana" });
});

describe("as duas vozes do texto", () => {
  it("para si, fala na segunda pessoa", () => {
    expect(labConsentFor("en-GB").points.join(" ")).toMatch(/The result is yours/);
    expect(labConsentFor("pt-BR").points.join(" ")).toMatch(/O resultado é seu/);
  });

  it("por outra pessoa, **cinco cláusulas mudam de dono** — não só a idade", () => {
    const dela = labConsentFor("en-GB", "Ana").points.join(" ");
    expect(dela).toMatch(/The result is Ana's, and it comes to you/);
    expect(dela).toMatch(/they receive Ana's name and date of birth/);
    expect(dela).toMatch(/or Ana's with you alongside/);
    expect(dela).toMatch(/If Ana is unwell/);
    expect(dela).toMatch(/ordered for by whoever is responsible for them/);
  });

  it("e o título e o botão também", () => {
    expect(labConsentFor("en-GB", "Ana").title).toBe("Before you order a test for Ana");
    expect(labConsentFor("pt-BR", "Ana").accept).toBe("Entendi e concordo, por Ana");
  });

  it("nenhum marcador sobra sem substituir, em nenhuma língua", () => {
    for (const loc of ["en-GB", "pt-BR"] as const) {
      const t = labConsentFor(loc, "Ana");
      expect(JSON.stringify(t)).not.toMatch(/\{nome\}/);
    }
  });

  it("a regra geral dos 16 anos saiu", () => {
    // Ela transformava a regra de dez exames na regra dos vinte e dois.
    for (const loc of ["en-GB", "pt-BR"] as const) {
      for (const nome of [undefined, "Ana"]) {
        const t = labConsentFor(loc, nome).points.join(" ");
        expect(t).not.toMatch(/Laboratory tests are for people aged 16 or over/);
        expect(t).not.toMatch(/Exames de laboratório são para maiores de 16 anos/);
      }
    }
  });

  it("e a versão subiu — senão quem aceitou a 1.1 nunca veria o texto novo", () => {
    expect(LAB_TESTS_CONSENT_VERSION).not.toBe("1.1");
  });
});

describe("por quem se consente", () => {
  it("**o aceite é gravado no nome do sujeito**, não no de quem paga", async () => {
    // É o exame dela que vai acontecer. Gravar no nome da mãe deixaria a
    // pergunta "houve consentimento para este exame?" sem resposta.
    await POST(url("?for=filha-1"));
    expect(consentCreate.mock.calls[0][0].data.patientId).toBe("filha-1");
  });

  it("e quem consentiu fica registrado — é a outra metade da pergunta", async () => {
    await POST(url("?for=filha-1"));
    const meta = consentCreate.mock.calls[0][0].data.metadata;
    expect(meta.consentedById).toBe("mae-1");
    expect(meta.onBehalf).toBe(true);
  });

  it("para si, nada disso aparece", async () => {
    await POST(url());
    expect(consentCreate.mock.calls[0][0].data.patientId).toBe("mae-1");
    expect(consentCreate.mock.calls[0][0].data.metadata).toEqual({ where: "labs" });
  });

  it("**a criança de outra pessoa não existe** — 404, e nada é gravado", async () => {
    findFirst.mockResolvedValue(null);
    const res = await POST(url("?for=filha-de-outra"));
    expect(res.status).toBe(404);
    expect(consentCreate).not.toHaveBeenCalled();
  });

  it("e a busca leva o responsável junto do id", async () => {
    await GET(new NextRequest("http://local/api/patient/lab-consent?for=filha-1"));
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "filha-1", managedById: "mae-1" }) })
    );
  });

  it("durante impersonação, ninguém aceita por ninguém", async () => {
    sessao = { userId: "mae-1", isImpersonating: true };
    expect((await POST(url("?for=filha-1"))).status).toBe(403);
    expect(consentCreate).not.toHaveBeenCalled();
  });

  it("sem sessão, nada", async () => {
    sessao = null;
    expect((await POST(url())).status).toBe(401);
  });
});

describe("o pedido pergunta pelo aceite certo", () => {
  const rota = ler("app", "api", "mobile", "labs", "orders", "route.ts");

  it("confere o consentimento **do sujeito**, não o de quem paga", () => {
    expect(rota).toMatch(/hasLabConsent\(subjectId \?\? payload\.sub\)/);
  });

  it("e resolve quem é o sujeito antes de perguntar", () => {
    // Invertido, a mãe passaria pelo próprio aceite e o exame da filha sairia
    // sem consentimento nenhum registrado no nome dela.
    expect(rota.indexOf("let subjectId")).toBeLessThan(rota.indexOf("hasLabConsent("));
  });
});

describe("o checkout não deixa a recusa acontecer no fim do caminho", () => {
  const tela = ler("mobile", "app", "(app)", "(lab)", "checkout.tsx");

  it("pede o aceite da pessoa escolhida, ali mesmo", () => {
    // O consentimento é perguntado na página do exame, mas o sujeito só é
    // escolhido no checkout. Sem isto, escolher a filha levaria a uma recusa
    // do servidor depois de preencher o endereço inteiro.
    expect(tela).toMatch(/testID="consent-do-sujeito"/);
    expect(tela).toMatch(/fetchLabConsent\(lang === "pt" \? "pt-BR" : "en-GB", paraQuem\)/);
    expect(tela).toMatch(/acceptLabConsent\(paraQuem\)/);
  });

  it("e o botão de pagar espera por ele", () => {
    expect(tela).toMatch(/const consentPronto = paraQuem === null \|\| consentDoSujeito\.data\?\.accepted === true;/);
    expect(tela).toMatch(/disabled=\{!addressValid \|\| !consentPronto \|\| mutation\.isPending\}/);
  });
});
