/**
 * @jest-environment node
 *
 * Os termos têm uma fonte só (26/09/2026).
 *
 * O Bruno abriu os termos no app para reler e achou curtos. Estavam: a tela
 * tinha **nove** itens cravados no próprio código, e os publicados tinham
 * **vinte e seis** — a seção inteira do laboratório, escrita naquele mesmo
 * dia, não existia no app.
 *
 * Duas cópias do mesmo texto divergem na primeira edição. O agravante é qual
 * das duas fica para trás: a que ninguém abre para editar é justamente a que
 * o paciente lê para decidir se concorda.
 *
 * Estes testes guardam a fonte única. O último é o que importa de verdade:
 * **nenhum lugar pode voltar a ter cópia própria.**
 */

import fs from "fs";
import path from "path";
import { SECOES_DOS_TERMOS, termosNaLingua, totalDeItens } from "@/lib/terms-content";

const raiz = path.join(__dirname, "..", "..");
const ler = (...p: string[]) => fs.readFileSync(path.join(raiz, ...p), "utf8");
const semComentarios = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*/g, "");

const paginaWeb = ler("app", "terms", "page.tsx");
const rota = ler("app", "api", "terms", "route.ts");
const telaApp = ler("mobile", "app", "(app)", "(clinica)", "consent.tsx");

describe("o conteúdo está completo e nas duas línguas", () => {
  it("as quatro seções existem", () => {
    expect(SECOES_DOS_TERMOS.map((s) => s.chave)).toEqual([
      "servico",
      "dados",
      "laboratorio",
      "responsabilidade",
    ]);
  });

  it("são vinte e seis itens, numerados de 1 a 26 sem buraco", () => {
    // O app mostrava nove destes.
    const ns = SECOES_DOS_TERMOS.flatMap((s) => s.itens.map((i) => i.n)).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
    expect(totalDeItens()).toBe(26);
  });

  it("todo item tem título e corpo nas duas línguas, e nada vazio", () => {
    for (const secao of SECOES_DOS_TERMOS) {
      expect(secao.titulo.en.length).toBeGreaterThan(3);
      expect(secao.titulo.pt.length).toBeGreaterThan(3);
      for (const item of secao.itens) {
        expect(item.titulo.en.trim()).not.toBe("");
        expect(item.titulo.pt.trim()).not.toBe("");
        expect(item.corpo.en.length).toBeGreaterThan(20);
        expect(item.corpo.pt.length).toBeGreaterThan(20);
      }
    }
  });

  it("a seção do laboratório está lá, com o que ela promete", () => {
    // É a que faltava inteira no app — e é a que diz de quem é a
    // responsabilidade pelo exame e para quem vai o resultado.
    const lab = SECOES_DOS_TERMOS.find((s) => s.chave === "laboratorio")!;
    expect(lab.itens).toHaveLength(6);
    const tudo = lab.itens.map((i) => i.corpo.en).join(" ");
    expect(tudo).toMatch(/laborator/i);
  });

  it("`termosNaLingua` devolve uma língua só, achatada", () => {
    const en = termosNaLingua("en");
    expect(en[0].titulo).toBe(SECOES_DOS_TERMOS[0].titulo.en);
    expect(en[0].itens[0].corpo).toBe(SECOES_DOS_TERMOS[0].itens[0].corpo.en);
    const pt = termosNaLingua("pt");
    expect(pt[0].titulo).toBe(SECOES_DOS_TERMOS[0].titulo.pt);
  });
});

describe("os três lugares leem a mesma fonte", () => {
  it("a página publicada", () => {
    expect(paginaWeb).toMatch(/import \{ termosNaLingua \} from "@\/lib\/terms-content"/);
    expect(paginaWeb).toMatch(/termosNaLingua\(isPt \? "pt" : "en"\)\.map/);
  });

  it("a rota", () => {
    expect(rota).toMatch(/termosNaLingua\(lang\)/);
    expect(rota).toMatch(/total: totalDeItens\(\)/);
  });

  it("e o app, que era o que estava para trás", () => {
    expect(telaApp).toMatch(/import \{ fetchTermos \} from "@\/api\/terms"/);
    expect(telaApp).toMatch(/queryKey: \["termos", lang\]/);
  });

  it("a chave do cache do app inclui a língua", () => {
    // Sem isso, trocar de idioma serviria o texto do idioma anterior — e os
    // termos são a última coisa que pode aparecer na língua errada.
    expect(telaApp).toMatch(/queryKey: \["termos", lang\]/);
    expect(telaApp).toMatch(/fetchTermos\(lang === "pt" \? "pt-BR" : "en-GB"\)/);
  });
});

describe("nenhuma cópia própria sobrou", () => {
  it("o app não tem mais o texto embutido", () => {
    // Era isto: `const SECTIONS = [...]` com nove itens dentro do app.
    const limpo = semComentarios(telaApp);
    expect(limpo).not.toMatch(/const SECTIONS/);
    expect(limpo).not.toMatch(/This platform provides physical rehabilitation/);
    expect(limpo).not.toMatch(/Data retention: at least 5 years/);
  });

  it("a página publicada não tem mais o texto no JSX", () => {
    const limpo = semComentarios(paginaWeb);
    expect(limpo).not.toMatch(/These terms govern your use of the Bruno Physical Rehabilitation/);
    expect(limpo).not.toMatch(/isPt\s*\?\s*'/);
  });

  it("e ela encolheu, porque o texto saiu de dentro dela", () => {
    // 360 linhas de JSX com o texto cravado em ternários.
    expect(paginaWeb.split("\n").length).toBeLessThan(180);
  });
});

describe("quem pode ler", () => {
  it("a rota é aberta — termos que exigem login ninguém lê antes de concordar", () => {
    expect(rota).not.toMatch(/getServerSession|getMobileUser|patientGate/);
  });

  it("e o app alcança a rota pelo middleware", () => {
    expect(ler("middleware.ts")).toMatch(/MOBILE_API_PREFIXES = \['\/api\/terms'/);
  });

  it("a tela não finge ter mostrado os termos quando falha", () => {
    // Sem texto e sem aviso, a pessoa acha que leu tudo.
    expect(telaApp).toMatch(/We could not load the terms/);
    expect(telaApp).toMatch(/termos\.refetch\(\)/);
  });
});
