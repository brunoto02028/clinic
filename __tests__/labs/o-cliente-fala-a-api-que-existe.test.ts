/**
 * @jest-environment node
 *
 * O cliente da LML tem de falar com a API que existe (081 T-5).
 *
 * Até 01/10/2026 ele falava com uma que não existe: host `.co.uk` (que não
 * resolve) e caminhos `/v1/products`, `/v1/orders`, `/v1/orders/{ref}/results`.
 * Nada disso dava erro de build nem de tipo — só daria 404 na primeira chamada
 * real, que nunca aconteceu porque o token nunca chegou.
 *
 * O terceiro caminho era o pior: **não existe resultado pendurado no pedido**.
 * Um pedido gera N registos de teste, e é o registo que tem paciente,
 * formulário, etiqueta e resultado. Era erro de estrutura disfarçado de erro
 * de grafia, e teria custado uma reescrita no dia do token em vez de hoje.
 *
 * Este teste compara a tabela de rotas do cliente com a **documentação deles
 * guardada no repo** (`specs/081-…/referencia/`, baixada em 01/10). Não pede
 * rede: a documentação é o oráculo, e está versionada junto.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const REFERENCIA = path.join(RAIZ, "specs", "081-exames-de-laboratorio-pelo-app", "referencia");

/** A documentação da LML, toda junta, como texto. */
function documentacao(): string {
  const arquivos = fs.readdirSync(REFERENCIA).filter((f) => f.endsWith(".txt"));
  expect(arquivos.length).toBeGreaterThan(8);
  return arquivos.map((f) => fs.readFileSync(path.join(REFERENCIA, f), "utf8")).join("\n");
}

/**
 * O código do cliente **sem comentários**.
 *
 * Os comentários deste arquivo citam de propósito os caminhos errados antigos,
 * para explicar o defeito. Uma varredura que os lesse encontraria `/v1/` e
 * `.co.uk` e aprovaria — ou reprovaria — pelo texto da explicação em vez do
 * código. Já me morderam três vezes com isto.
 */
function codigoDoCliente(): string {
  const bruto = fs.readFileSync(path.join(RAIZ, "lib", "lml.ts"), "utf8");
  return bruto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith("//") && !t.startsWith("*");
    })
    .join("\n");
}

describe("o cliente da LML fala com a API documentada", () => {
  it("**toda rota do cliente está na documentação deles**", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ROTAS } = require("@/lib/lml");
    const doc = documentacao();
    const ausentes = Object.entries(ROTAS as Record<string, string>)
      .filter(([, caminho]) => !doc.includes(caminho))
      .map(([nome, caminho]) => `${nome} -> ${caminho}`);
    expect(ausentes).toEqual([]);
  });

  it("a tabela cobre o que as tarefas T-5 a T-9 precisam", () => {
    // Senão um `ROTAS = {}` passaria no teste de cima por vacuidade.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ROTAS } = require("@/lib/lml");
    for (const chave of ["produtos", "pacientes", "pedidos", "registos", "resultados", "webhook"]) {
      expect(Object.keys(ROTAS)).toContain(chave);
    }
  });

  it("**o resultado pende do registo de teste, não do pedido**", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ROTAS } = require("@/lib/lml");
    expect(ROTAS.resultados).toContain("/test_registration/");
    expect(ROTAS.resultados).not.toContain("/order/");
  });

  it("nenhum caminho `/v1/` sobrou no código", () => {
    expect(codigoDoCliente()).not.toContain("/v1/");
  });

  it("o host é o que responde: `.com`, não `.co.uk`", () => {
    const codigo = codigoDoCliente();
    expect(codigo).toContain("https://api.londonmedicallaboratory.com");
    expect(codigo).not.toContain("londonmedicallaboratory.co.uk");
  });
});

describe("sem token, e com o 204 deles", () => {
  const ambienteOriginal = process.env.LML_API_KEY;
  const fetchOriginal = global.fetch;

  afterEach(() => {
    process.env.LML_API_KEY = ambienteOriginal;
    global.fetch = fetchOriginal;
    jest.resetModules();
  });

  it("sem token, uma chamada falha por tipo — não por 401 do outro lado", async () => {
    jest.resetModules();
    delete process.env.LML_API_KEY;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lml = require("@/lib/lml");
    expect(lml.temTokenDoLaboratorio()).toBe(false);
    await expect(lml.listarProdutos()).rejects.toThrow(lml.LmlSemToken);
  });

  it("**o 204 vira `null`, não exceção** — é 'ainda não', não 'falhou'", async () => {
    jest.resetModules();
    process.env.LML_API_KEY = "token-de-teste";
    const chamadas: string[] = [];
    global.fetch = jest.fn(async (url: any) => {
      chamadas.push(String(url));
      return { status: 204, ok: true, json: async () => ({}) } as any;
    }) as any;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lml = require("@/lib/lml");
    await expect(lml.resultados("LML-AB1234")).resolves.toBeNull();
    expect(chamadas[0]).toContain("/api/test_registration/LML-AB1234/lab_results");
  });

  it("o `{id}` do caminho é escapado — um TRF com barra não inventa rota", async () => {
    jest.resetModules();
    process.env.LML_API_KEY = "token-de-teste";
    const chamadas: string[] = [];
    global.fetch = jest.fn(async (url: any) => {
      chamadas.push(String(url));
      return { status: 200, ok: true, json: async () => ({ id: "x" }) } as any;
    }) as any;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lml = require("@/lib/lml");
    await lml.registoDeTeste("../order/outro");
    expect(chamadas[0]).not.toContain("/api/order/outro");
  });
});
