/**
 * @jest-environment node
 *
 * Procurar um ponto de coleta por código postal (091 T-1).
 *
 * O Bruno, testando o build 17: *"A gente não tem ainda onde buscar os pontos
 * de coletas. Não tem um lugar para fazer uma busca por postcode."*
 *
 * A rota existia e lia **só o código postal do cadastro**. Quem quer conferir
 * se há ponto perto do trabalho, ou da casa de quem vai levar a criança, teria
 * de editar o perfil para fazer uma pergunta.
 *
 * **Estes testes chamam a rota de verdade.** O que eles guardam é a promessa
 * mais fácil de quebrar numa mudança dessas: que passar a aceitar uma busca
 * não mudou o que a rota já respondia sem ela.
 */

import { NextRequest } from "next/server";

const findUnique = jest.fn();
const produtosDoPedido = jest.fn();
const coordenadaDoPostcode = jest.fn();
const nearestTestLocations = jest.fn();
let usuarioDoToken: { sub: string } | null = { sub: "u1" };

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: (...a: any[]) => findUnique(...a) },
    labProduct: { findMany: (...a: any[]) => produtosDoPedido(...a) },
  },
}));
jest.mock("@/lib/mobile-auth-guard", () => ({ getMobileUser: () => usuarioDoToken }));
jest.mock("@/lib/lml", () => ({ nearestTestLocations: (...a: any[]) => nearestTestLocations(...a) }));
jest.mock("@/lib/postcode", () => {
  // `normalizarPostcode` e `postcodeDoCadastro` ficam reais: é a forma de um
  // código postal britânico, e reimplementá-la no mock seria testar o mock.
  const real = jest.requireActual("@/lib/postcode");
  return { ...real, coordenadaDoPostcode: (...a: any[]) => coordenadaDoPostcode(...a) };
});

import { GET } from "@/app/api/mobile/labs/collection-points/route";
import { precisaDePontoDeColeta } from "@/lib/lab-patient";

const LONDRES = { lat: 51.501, long: -0.141, local: "Westminster" };

async function chamar(query = ""): Promise<any> {
  const res = await GET(new NextRequest(`http://local/api/mobile/labs/collection-points${query}`));
  return res.json();
}

beforeEach(() => {
  jest.clearAllMocks();
  usuarioDoToken = { sub: "u1" };
  // O estado mais comum hoje: cadastro com código postal, laboratório ainda
  // sem token. É o que produção devolve neste momento.
  findUnique.mockResolvedValue({ postcode: "E1 6AN", address: null, city: "London" });
  coordenadaDoPostcode.mockResolvedValue(LONDRES);
  nearestTestLocations.mockResolvedValue(null);
});

describe("a busca", () => {
  it("usa o código procurado, e **não toca no cadastro**", async () => {
    const r = await chamar("?postcode=SW1A%201AA");
    expect(r.postcode).toBe("SW1A 1AA");
    // A garantia que importa: perguntar não altera nem lê o perfil de ninguém.
    expect(findUnique).not.toHaveBeenCalled();
    expect(coordenadaDoPostcode).toHaveBeenCalledWith("SW1A 1AA");
  });

  it("normaliza o que a pessoa digita", async () => {
    // Ninguém digita com o espaço no lugar certo.
    const r = await chamar("?postcode=sw1a1aa");
    expect(r.postcode).toBe("SW1A 1AA");
  });

  it("um texto sem forma de código postal é erro de digitação, não lista vazia", async () => {
    const r = await chamar("?postcode=onde%20fica");
    expect(r.estado).toBe("postcode_desconhecido");
    expect(r.postcode).toBe("onde fica");
    // Nem chega a perguntar ao serviço externo: a forma já reprovou.
    expect(coordenadaDoPostcode).not.toHaveBeenCalled();
  });

  it("um código com a forma certa que não existe também é desconhecido", async () => {
    coordenadaDoPostcode.mockResolvedValue(null);
    const r = await chamar("?postcode=ZZ1A%201AA");
    expect(r.estado).toBe("postcode_desconhecido");
    expect(r.postcode).toBe("ZZ1A 1AA");
  });

  it("busca vazia cai no cadastro, e não vira erro", async () => {
    const r = await chamar("?postcode=");
    expect(findUnique).toHaveBeenCalled();
    expect(r.postcode).toBe("E1 6AN");
  });
});

describe("sem busca, nada mudou", () => {
  it("responde pelo cadastro", async () => {
    const r = await chamar();
    expect(findUnique).toHaveBeenCalled();
    expect(r.postcode).toBe("E1 6AN");
  });

  it("sem código postal no cadastro, diz isso", async () => {
    findUnique.mockResolvedValue({ postcode: null, address: null, city: null });
    const r = await chamar();
    expect(r.estado).toBe("sem_postcode");
    expect(r.pontos).toEqual([]);
  });

  it("sem sessão, ninguém procura nada", async () => {
    usuarioDoToken = null;
    const res = await GET(new NextRequest("http://local/api/mobile/labs/collection-points?postcode=SW1A%201AA"));
    expect(res.status).toBe(401);
  });
});

describe("quem precisa de ponto é o pedido, e ele pergunta ao dado", () => {
  /**
   * O Bruno, 27/09: *"só pode encontrar o ponto de coleta depois de pagar."*
   *
   * O que este bloco guarda é a honestidade do cartão. Hoje os 22 exames do
   * catálogo são `capillary` — picada no dedo em casa —, então o cartão nunca
   * aparece, **e isso é o certo**: oferecer "procure um ponto" a quem vai
   * receber um envelope pelo correio é mandar a pessoa a lugar nenhum.
   *
   * A decisão sai do banco e não de uma lista fixa, para que o primeiro exame
   * venoso ligue o cartão sozinho.
   */
  const pedido = (...tipos: (string | null)[]) => ({
    items: tipos.map((_, i) => ({ productId: `p${i}` })),
  }) as any;

  it("kit em casa não oferece ponto — o catálogo inteiro de hoje", async () => {
    produtosDoPedido.mockResolvedValue([{ sampleType: "capillary" }]);
    expect(await precisaDePontoDeColeta(pedido("capillary"))).toBe(false);
  });

  it("nem o de picada com swab", async () => {
    produtosDoPedido.mockResolvedValue([{ sampleType: "capillary+swab" }]);
    expect(await precisaDePontoDeColeta(pedido("capillary+swab"))).toBe(false);
  });

  it("um exame venoso liga o cartão", async () => {
    produtosDoPedido.mockResolvedValue([{ sampleType: "venous" }]);
    expect(await precisaDePontoDeColeta(pedido("venous"))).toBe(true);
  });

  it("basta um venoso no meio de vários", async () => {
    produtosDoPedido.mockResolvedValue([{ sampleType: "capillary" }, { sampleType: "venous" }]);
    expect(await precisaDePontoDeColeta(pedido("capillary", "venous"))).toBe(true);
  });

  it("produto sem tipo de amostra não inventa uma coleta", async () => {
    // `sampleType` é opcional no schema. Nulo não é "venoso".
    produtosDoPedido.mockResolvedValue([{ sampleType: null }]);
    expect(await precisaDePontoDeColeta(pedido(null))).toBe(false);
  });

  it("pedido vazio nem consulta o banco", async () => {
    expect(await precisaDePontoDeColeta({ items: [] } as any)).toBe(false);
    expect(produtosDoPedido).not.toHaveBeenCalled();
  });
});

describe("os estados que dependem do laboratório", () => {
  it("sem a conexão, a área fica confirmada — que é o caso de hoje", async () => {
    const r = await chamar("?postcode=SW1A%201AA");
    expect(r.estado).toBe("laboratorio_desconectado");
    expect(r.local).toBe("Westminster");
    expect(r.pontos).toEqual([]);
  });

  it("com a conexão, os pontos vêm da coordenada procurada", async () => {
    nearestTestLocations.mockResolvedValue([
      { id: "p1", nome: "Boots Victoria", endereco: "1 Victoria St", distanciaKm: 0.4 },
    ]);
    const r = await chamar("?postcode=SW1A%201AA");
    expect(r.estado).toBe("ok");
    expect(nearestTestLocations).toHaveBeenCalledWith(LONDRES.lat, LONDRES.long);
    expect(r.pontos).toHaveLength(1);
  });
});
