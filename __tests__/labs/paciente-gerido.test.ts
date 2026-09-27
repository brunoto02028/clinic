/**
 * @jest-environment node
 *
 * A criança é paciente, e não entra sozinha (091 T-7).
 *
 * O Bruno, 27/09: *"A mesma coisa na parte da clínica. Se o paciente é uma
 * criança, a mãe tem que fazer o cadastro e colocar a criança como uma
 * dependente. E é a criança que está fazendo o tratamento de reabilitação."*
 *
 * ## Por que o desenho mudou no meio da atividade
 *
 * A primeira versão era uma tabela `Dependent` separada, e servia para o
 * laboratório — lá o dependente é só o sujeito de um pedido. Na clínica ele é
 * **a paciente**: consulta, protocolo, exercício prescrito, nota clínica.
 *
 * Há 144 relações 1-N penduradas em `User`, 45 delas claramente clínicas.
 * Apontá-las para uma tabela separada seria duplicar o sistema. Então a criança
 * virou um `User` — e a promessa "ela não entra sozinha" deixou de ser uma
 * propriedade da estrutura e passou a ser **três camadas**, que é o que estes
 * testes existem para guardar.
 */

import { NextRequest } from "next/server";
import { ler } from "../helpers/codigo";
import {
  validarPessoa,
  idadeEmAnos,
  ehMenorDeIdade,
  pessoaPublica,
  emailSintetico,
  ehEmailSintetico,
} from "@/lib/managed-patients";

const findMany = jest.fn();
const findFirst = jest.fn();
const create = jest.fn();
const update = jest.fn();
const remover = jest.fn();
const count = jest.fn();
let usuarioDoToken: { sub: string; clinicId?: string | null } | null = { sub: "mae-1", clinicId: "c1" };

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: (...a: any[]) => findMany(...a),
      findFirst: (...a: any[]) => findFirst(...a),
      create: (...a: any[]) => create(...a),
      update: (...a: any[]) => update(...a),
      delete: (...a: any[]) => remover(...a),
      count: (...a: any[]) => count(...a),
    },
  },
}));
jest.mock("@/lib/mobile-auth-guard", () => ({ getMobileUser: () => usuarioDoToken }));

import { GET, POST } from "@/app/api/mobile/dependents/route";
import { PATCH, DELETE } from "@/app/api/mobile/dependents/[id]/route";

const URL_BASE = "http://local/api/mobile/dependents";
const corpo = (b: unknown) =>
  new NextRequest(URL_BASE, { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } });

const FILHA = {
  id: "d1",
  firstName: "Ana",
  lastName: "Souza",
  dateOfBirth: new Date("2015-06-10T00:00:00Z"),
  sex: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  usuarioDoToken = { sub: "mae-1", clinicId: "c1" };
  count.mockResolvedValue(0);
});

describe("as três camadas que impedem a criança de entrar", () => {
  const auth = ler("lib", "auth-credentials.ts");
  const lib = ler("lib", "managed-patients.ts");

  it("1. a senha nasce nula — não há o que conferir", () => {
    expect(lib).toMatch(/password: null/);
  });

  it("2. o e-mail é sintético, em domínio que ninguém entrega", () => {
    // `.invalid` é reservado pela RFC 2606. Não há recuperação de senha nem
    // link de convite que chegue a este endereço.
    const e = emailSintetico();
    expect(e).toMatch(/@no-mail\.invalid$/);
    expect(ehEmailSintetico(e)).toBe(true);
    expect(ehEmailSintetico("mae@gmail.com")).toBe(false);
  });

  it("e dois deles nunca colidem", () => {
    const muitos = new Set(Array.from({ length: 500 }, () => emailSintetico()));
    expect(muitos.size).toBe(500);
  });

  it("**3. o login recusa `managedById` antes de qualquer outro caminho**", () => {
    // Esta é a camada que não depende de ninguém lembrar das outras duas:
    // basta alguém, um dia, acrescentar login por link ou definir senha por
    // script, e só ela continua de pé.
    expect(auth).toMatch(/if \(user\.managedById\) \{/);
    const iGerido = auth.indexOf("user.managedById");
    const iSenha = auth.indexOf("bcrypt.compare");
    const iAtivo = auth.indexOf("if (!user.isActive)");
    expect(iGerido).toBeLessThan(iAtivo);
    expect(iGerido).toBeLessThan(iSenha);
  });

  it("e a recusa não confirma que a conta existe", () => {
    // "Esta conta é gerida" diria, a quem estivesse tentando, que aquela
    // pessoa existe. A mensagem é a mesma de e-mail desconhecido.
    const i = auth.indexOf("user.managedById");
    expect(auth.slice(i, i + 500)).toMatch(/Invalid email or password/);
  });
});

describe("a criança é paciente de verdade", () => {
  it("nasce com papel de paciente e na clínica de quem responde por ela", async () => {
    // Herdar a clínica é o que impede um paciente de nascer fora de qualquer
    // tenant — o estado em que as rotas antigas vazavam.
    create.mockResolvedValue(FILHA);
    await POST(corpo({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2015-06-10" }));
    const dados = create.mock.calls[0][0].data;
    expect(dados.role).toBe("PATIENT");
    expect(dados.clinicId).toBe("c1");
    expect(dados.managedById).toBe("mae-1");
  });

  it("e nada chega ao telefone dela — ela não tem aparelho aqui", async () => {
    create.mockResolvedValue(FILHA);
    await POST(corpo({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2015-06-10" }));
    expect(create.mock.calls[0][0].data.pushEnabled).toBe(false);
  });

  it("**remover é desligar, nunca apagar**", async () => {
    // Agora que ela é paciente de verdade, pode ter consulta, nota clínica e
    // exame no nome dela. `user.delete` cascatearia sobre tudo isso — e o
    // registro clínico não é do responsável para apagar a pedido.
    findFirst.mockResolvedValue(FILHA);
    await DELETE(new NextRequest(URL_BASE, { method: "DELETE" }), { params: Promise.resolve({ id: "d1" }) });
    expect(remover).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
    expect(update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
  });
});

describe("o responsável vem da sessão, e de mais lugar nenhum", () => {
  it("a lista é sempre filtrada por quem pediu", async () => {
    findMany.mockResolvedValue([FILHA]);
    await GET(new NextRequest(URL_BASE));
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { managedById: "mae-1", deletedAt: null } })
    );
  });

  it("e um dono no corpo é ignorado", async () => {
    create.mockResolvedValue(FILHA);
    await POST(corpo({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2015-06-10", managedById: "invasor" }));
    expect(create.mock.calls[0][0].data.managedById).toBe("mae-1");
  });

  it("a criança de outra conta **não existe** — 404, sem confirmar o id", async () => {
    findFirst.mockResolvedValue(null);
    const res = await PATCH(corpo({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2015-06-10" }), {
      params: Promise.resolve({ id: "de-outra-mae" }),
    });
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("e a busca leva o responsável junto do id", async () => {
    findFirst.mockResolvedValue(null);
    await DELETE(new NextRequest(URL_BASE, { method: "DELETE" }), { params: Promise.resolve({ id: "x" }) });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "x", managedById: "mae-1" }) })
    );
  });

  it("sem sessão, nada", async () => {
    usuarioDoToken = null;
    expect((await GET(new NextRequest(URL_BASE))).status).toBe(401);
    expect((await POST(corpo({}))).status).toBe(401);
  });
});

describe("o que a pessoa digita é conferido", () => {
  const agora = new Date("2026-09-27T09:00:00Z");

  it("nome e sobrenome são obrigatórios", () => {
    for (const b of [{}, { firstName: "Ana" }, { lastName: "Souza" }, { firstName: "  ", lastName: "Souza" }]) {
      expect(validarPessoa({ ...b, dateOfBirth: "2015-06-10" }, agora)).toHaveProperty("erro");
    }
  });

  it("**data no futuro é recusada** — viraria idade negativa", () => {
    const r = validarPessoa({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2027-01-01" }, agora);
    expect((r as any).erroPt).toMatch(/futuro/);
  });

  it("e o nome vem limpo", () => {
    const r = validarPessoa({ firstName: "  Ana   Lúcia ", lastName: " Souza ", dateOfBirth: "2015-06-10" }, agora);
    expect((r as any).pessoa.firstName).toBe("Ana Lúcia");
  });
});

describe("a idade, que é o dado que o laboratório usa", () => {
  it("conta anos completos", () => {
    const nasc = new Date("2010-06-10T00:00:00Z");
    expect(idadeEmAnos(nasc, new Date("2026-06-09T23:00:00Z"))).toBe(15);
    expect(idadeEmAnos(nasc, new Date("2026-06-10T00:00:00Z"))).toBe(16);
  });

  it("acerta quem nasceu em 29 de fevereiro", () => {
    // A conta por divisão de milissegundos erra este caso, e "faz 16 hoje" é
    // exatamente onde a resposta precisa estar certa.
    const bissexto = new Date("2008-02-29T00:00:00Z");
    expect(idadeEmAnos(bissexto, new Date("2024-02-28T12:00:00Z"))).toBe(15);
    expect(idadeEmAnos(bissexto, new Date("2024-02-29T12:00:00Z"))).toBe(16);
  });

  it("menor de idade no Reino Unido é abaixo de 18", () => {
    const nasc = new Date("2008-09-27T00:00:00Z");
    expect(ehMenorDeIdade(nasc, new Date("2026-09-26T00:00:00Z"))).toBe(true);
    expect(ehMenorDeIdade(nasc, new Date("2026-09-27T00:00:00Z"))).toBe(false);
  });

  it("e é calculada, nunca guardada", () => {
    // Idade guardada envelhece em silêncio e um dia manda a faixa de
    // referência errada para o laboratório.
    expect(pessoaPublica(FILHA).idade).toBe(idadeEmAnos(FILHA.dateOfBirth));
    const schema = ler("prisma", "schema.prisma");
    const user = schema.slice(schema.indexOf("model User {"), schema.indexOf("\n}\n", schema.indexOf("model User {")));
    expect(user).not.toMatch(/^\s+age\s+Int/m);
  });
});

describe("o que sai para o app", () => {
  it("não leva o e-mail sintético junto", () => {
    // Ele existe para satisfazer uma coluna única, e para mais nada. Mostrá-lo
    // faria a mãe achar que a filha tem caixa de entrada.
    const publico = pessoaPublica(FILHA) as Record<string, unknown>;
    expect(publico).not.toHaveProperty("email");
    expect(publico).not.toHaveProperty("managedById");
  });

  it("e diz se é menor, que é o que decide pedir consentimento de responsável", () => {
    expect(pessoaPublica(FILHA).menorDeIdade).toBe(true);
  });

  it("há um teto por conta", async () => {
    count.mockResolvedValue(10);
    const res = await POST(corpo({ firstName: "Ana", lastName: "Souza", dateOfBirth: "2015-06-10" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
