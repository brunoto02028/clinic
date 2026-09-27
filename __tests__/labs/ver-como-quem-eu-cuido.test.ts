/**
 * @jest-environment node
 *
 * A área do responsável (091 T-7).
 *
 * O Bruno: *"é a criança que está fazendo o tratamento de reabilitação."* A
 * mãe precisa ver a agenda, o protocolo e os exercícios da filha.
 *
 * **A solução é o token dizer de quem é a requisição.** Cada rota clínica do
 * app lê `payload.sub`; um token cujo `sub` é a criança faz todas elas
 * responderem sobre ela sem mudar uma linha. O que este arquivo guarda são os
 * limites desse empréstimo — porque um token que fala por outra pessoa é
 * exatamente o tipo de coisa que, mal fechada, vira um buraco.
 */

import { NextRequest } from "next/server";
import { ler } from "../helpers/codigo";
import { signAccessToken, verifyAccessToken, signManagedPatientToken, ehSessaoDeTerceiro } from "@/lib/mobile-tokens";

const findFirst = jest.fn();
let sessao: any = { sub: "mae-1", clinicId: "c1", clinicName: "BPR", clinicSlug: "bpr", clinicType: "CLINIC" };

jest.mock("@/lib/db", () => ({ prisma: { user: { findFirst: (...a: any[]) => findFirst(...a) } } }));
jest.mock("@/lib/mobile-auth-guard", () => ({ getMobileUser: () => sessao }));

import { POST } from "@/app/api/mobile/dependents/[id]/session/route";

const FILHA = {
  id: "filha-1",
  firstName: "Ana",
  lastName: "Souza",
  dateOfBirth: new Date("2015-06-10T00:00:00Z"),
  sex: null,
  clinicId: "c1",
};

const chamar = (id: string) =>
  POST(new NextRequest(`http://local/api/mobile/dependents/${id}/session`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MOBILE_JWT_SECRET ??= "segredo-de-teste-com-tamanho-suficiente-para-hs256";
  sessao = { sub: "mae-1", clinicId: "c1", clinicName: "BPR", clinicSlug: "bpr", clinicType: "CLINIC" };
  findFirst.mockResolvedValue(FILHA);
});

describe("o token emprestado", () => {
  it("**fala pela criança** — é isso que faz as rotas clínicas funcionarem", () => {
    const t = signManagedPatientToken({
      child: { id: "filha-1", firstName: "Ana", lastName: "Souza", clinicId: "c1" },
      guardian: sessao,
    });
    const p = verifyAccessToken(t);
    expect(p.sub).toBe("filha-1");
    expect(p.firstName).toBe("Ana");
    expect(p.role).toBe("PATIENT");
  });

  it("e diz quem o pediu", () => {
    const t = signManagedPatientToken({
      child: { id: "filha-1", firstName: "Ana", lastName: "Souza", clinicId: "c1" },
      guardian: sessao,
    });
    expect(verifyAccessToken(t).onBehalfOf).toBe("mae-1");
    expect(ehSessaoDeTerceiro(verifyAccessToken(t))).toBe(true);
  });

  it("sem o e-mail sintético — nada deve tentar escrever para ele", () => {
    const t = signManagedPatientToken({
      child: { id: "filha-1", firstName: "Ana", lastName: "Souza", clinicId: "c1" },
      guardian: sessao,
    });
    expect(verifyAccessToken(t).email).toBe("");
  });

  it("e sem permissão nenhuma — pessoa gerida é sempre paciente", () => {
    const t = signManagedPatientToken({
      child: { id: "filha-1", firstName: "Ana", lastName: "Souza", clinicId: "c1" },
      guardian: { ...sessao, permissions: { canManageUsers: true, canViewAllPatients: true } },
    });
    const p = verifyAccessToken(t);
    expect(Object.values(p.permissions as Record<string, boolean>).every((v) => v === false)).toBe(true);
  });

  it("um token normal não é sessão de terceiro", () => {
    const t = signAccessToken({
      id: "mae-1", email: "mae@x.com", name: "Mae", role: "PATIENT", firstName: "Mae", lastName: "Souza",
      clinicId: "c1", clinicName: "BPR", clinicSlug: "bpr", clinicType: "CLINIC", clinicLogoUrl: null,
      clinicPrimaryColor: null, instagramImportEnabled: false, permissions: {} as any,
    } as any);
    expect(ehSessaoDeTerceiro(verifyAccessToken(t))).toBe(false);
  });
});

describe("quem pode pedir o empréstimo", () => {
  it("o responsável, pela pessoa que ele cuida", async () => {
    const res = await chamar("filha-1");
    expect(res.status).toBe(200);
    const d = await res.json();
    expect(verifyAccessToken(d.accessToken).sub).toBe("filha-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "filha-1", managedById: "mae-1" }) })
    );
  });

  it("**a criança de outra pessoa não existe** — 404, sem confirmar o id", async () => {
    findFirst.mockResolvedValue(null);
    expect((await chamar("filha-de-outra")).status).toBe(404);
  });

  it("**não se aninha** — quem já vê como alguém não pede a sessão de um terceiro", async () => {
    // Seria um encadeamento sem dono claro, e o `managedById` deixaria de
    // responder a "quem autorizou isto?".
    sessao = { ...sessao, onBehalfOf: "avo-1" };
    const res = await chamar("filha-1");
    expect(res.status).toBe(403);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("sem sessão, nada", async () => {
    sessao = null;
    expect((await chamar("filha-1")).status).toBe(401);
  });
});

describe("o que se pode fazer enquanto vê como outra pessoa", () => {
  it("**não comprar exame** — o pagamento é de quem paga", () => {
    const rota = ler("app", "api", "mobile", "labs", "orders", "route.ts");
    expect(rota).toMatch(/if \(ehSessaoDeTerceiro\(payload\)\)/);
    expect(rota).toMatch(/code: "on_behalf_read_only"/);
  });

  it("nem cadastrar, editar ou remover pessoas", () => {
    const lista = ler("app", "api", "mobile", "dependents", "route.ts");
    const um = ler("app", "api", "mobile", "dependents", "[id]", "route.ts");
    expect(lista).toMatch(/ehSessaoDeTerceiro\(payload\)/);
    expect((um.match(/ehSessaoDeTerceiro\(payload\)/g) ?? []).length).toBe(2);
  });

  it("e as rotas `/api/patient/*` tratam isso como impersonação", () => {
    // Doze recusas de escrita já endurecidas passam a valer de imediato:
    // consentimento, apagar conta, editar perfil, confirmar consulta.
    const g = ler("lib", "get-effective-user.ts");
    expect(g).toMatch(/onBehalfOf: payload\.onBehalfOf/);
    expect(g).toMatch(/if \(porContaDe\) \{/);
    // `\s+` e não o espaçamento exato: a promessa é o par de campos, não a
    // indentação, que qualquer formatador muda.
    expect(g).toMatch(/isImpersonating:\s*true,\s*realAdminId:\s*porContaDe,/);
  });
});

describe("o lado do app", () => {
  it("o token emprestado ganha do próprio em toda chamada", () => {
    const c = ler("mobile", "src", "api", "client.ts");
    expect((c.match(/tokenEmprestado\(\) \?\? \(await tokenStorage\.getAccess\(\)\)/g) ?? []).length).toBe(2);
  });

  it("**e um 401 não cai no refresh do responsável**", () => {
    // Renovar a sessão da mãe devolveria um token dela, e a tela da filha
    // passaria a mostrar os dados da mãe em silêncio — o pior desfecho.
    const c = ler("mobile", "src", "api", "client.ts");
    expect(c).toMatch(/const renovou = tokenEmprestado\(\) \? await renovarEmprestimo\(\) : false;/);
  });

  it("o empréstimo mora só na memória — fechar o app volta para si", () => {
    const store = ler("mobile", "src", "store", "vendo-como.ts");
    expect(store).not.toMatch(/SecureStore|AsyncStorage/);
    const folha = ler("mobile", "src", "lib", "emprestimo.ts");
    expect(folha).not.toMatch(/^import /m);
  });

  it("e o pedido do empréstimo usa o token do responsável, nunca o emprestado", () => {
    const store = ler("mobile", "src", "store", "vendo-como.ts");
    expect(store).toMatch(/const acesso = await tokenStorage\.getAccess\(\);/);
  });

  it("a faixa avisa em toda tela, e oferece a volta", () => {
    const faixa = ler("mobile", "src", "components", "FaixaVendoComo.tsx");
    expect(faixa).toMatch(/testID="faixa-vendo-como"/);
    expect(faixa).toMatch(/testID="voltar-a-mim"/);
    // Fora do Stack, senão sumiria a cada navegação. A comparação é contra o
    // **elemento** `<Stack` do JSX, não contra o `Stack` do import — que vem
    // na primeira linha do arquivo e faria este teste passar sempre.
    const layout = ler("mobile", "app", "(app)", "_layout.tsx");
    const jsx = layout.slice(layout.lastIndexOf("return ("));
    expect(jsx).toMatch(/<FaixaVendoComo \/>/);
    expect(jsx.indexOf("<FaixaVendoComo />")).toBeLessThan(jsx.indexOf("<Stack"));
  });

  it("e o cache é limpo nos dois sentidos", () => {
    // Dado da pessoa errada com o nome certo é o pior estado de uma tela
    // clínica.
    expect(ler("mobile", "app", "(app)", "(lab)", "dependents.tsx")).toMatch(/qc\.clear\(\);/);
    expect(ler("mobile", "src", "components", "FaixaVendoComo.tsx")).toMatch(/qc\.clear\(\);/);
  });
});
