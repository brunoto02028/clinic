/**
 * @jest-environment node
 *
 * Nenhum terceiro novo entra sem ser declarado (117 T-1).
 *
 * O critério de aceite da tarefa era este: *"um terceiro novo sem declaração
 * derruba o teste"*. Sem isto o inventário é uma fotografia de 01/10/2026 que
 * envelhece na primeira integração nova, e a política de privacidade volta a
 * descrever um produto que não existe — que foi exactamente como esta atividade
 * nasceu.
 *
 * ## O que a varredura mede, e o que não
 *
 * Mede **host escrito no código** — num `fetch`, numa constante de base, num
 * endpoint. É como se alcança quase tudo.
 *
 * **Não** mede quem fala por SDK: o Stripe e o Resend não têm host em lugar
 * nenhum do nosso código, e por isso estão declarados à mão em
 * `lib/terceiros.ts`. Um SDK novo não cai aqui. É o furo conhecido deste teste,
 * e dizê-lo é melhor que fingir cobertura que não existe.
 */

import * as fs from "fs";
import * as path from "path";
import { TERCEIROS, hostsDeclarados, recebemCategoriaEspecial } from "@/lib/terceiros";

const RAIZ = path.join(__dirname, "..", "..");

/**
 * As linhas em que um host externo chega ao código: a chamada, a constante de
 * base, o endpoint. Procurar `https://` em qualquer linha traria todo link de
 * marcação — `youtube.com`, `royalmail.com`, `schema.org` — que não recebe nada
 * nosso. O recorte é o que faz a diferença entre um teste que se lê e um teste
 * que se ignora.
 */
const LINHA_DE_CHAMADA =
  /fetch\(|(?:const|let)\s+[A-Za-z_]+\s*(?::[^=]*)?=\s*["'`]https:\/\/|[A-Z_]*BASE[A-Z_]*\s*=|API_URL|ENDPOINT\s*=|_URL\s*=/;

function hostsNoCodigo(): Map<string, string[]> {
  const achados = new Map<string, string[]>();
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        if (nome === "node_modules" || nome.startsWith(".")) continue;
        anda(p);
        continue;
      }
      if (!/\.tsx?$/.test(nome)) continue;
      const linhas = fs.readFileSync(p, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        if (!LINHA_DE_CHAMADA.test(linha)) return;
        for (const m of linha.matchAll(/https:\/\/([a-zA-Z0-9.-]+\.[a-z]{2,})/g)) {
          const host = m[1];
          const onde = `${path.relative(RAIZ, p).split(path.sep).join("/")}:${i + 1}`;
          achados.set(host, [...(achados.get(host) ?? []), onde]);
        }
      });
    }
  };
  for (const base of ["app", "lib"]) anda(path.join(RAIZ, base));
  return achados;
}

/**
 * O código de um arquivo **sem comentários**.
 *
 * Vários arquivos explicam de propósito porque a MiniMax saiu, e citam o host e
 * o nome da chave para a explicação fazer sentido. Uma varredura que lesse os
 * comentários reprovaria pelo texto da explicação em vez do código — é o mesmo
 * erro que já me morreu três vezes neste projeto.
 */
function codigoSemComentarios(p: string): string {
  return fs
    .readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => {
      const s = l.trim();
      return !s.startsWith("//") && !s.startsWith("*");
    })
    .join("\n");
}

function arquivosDoProduto(): string[] {
  const saida: string[] = [];
  const anda = (dir: string) => {
    for (const nome of fs.readdirSync(dir)) {
      const p = path.join(dir, nome);
      if (fs.statSync(p).isDirectory()) {
        if (nome === "node_modules" || nome === "dist" || nome.startsWith(".")) continue;
        anda(p);
        continue;
      }
      if (/\.tsx?$/.test(nome)) saida.push(p);
    }
  };
  for (const base of ["app", "lib", "components", path.join("mobile", "app")]) {
    const d = path.join(RAIZ, base);
    if (fs.existsSync(d)) anda(d);
  }
  return saida;
}

describe("todo terceiro que o código alcança está declarado", () => {
  it("**nenhum host externo fora de `lib/terceiros.ts`**", () => {
    const declarados = hostsDeclarados();
    const naoDeclarados = [...hostsNoCodigo().entries()]
      .filter(([host]) => !declarados.has(host))
      .map(([host, ondes]) => `${host} (${ondes[0]})`);
    expect(naoDeclarados).toEqual([]);
  });

  it("a varredura encontra hosts — senão aprova o vazio", () => {
    // Sem isto, um recorte quebrado passaria o teste de cima com zero achados.
    expect(hostsNoCodigo().size).toBeGreaterThan(25);
  });

  it("todo host declarado ainda é alcançado por alguém", () => {
    // O outro lado do mesmo erro: declarar um processador que já não se usa
    // gasta a confiança de quem lê a política tanto quanto omitir um que se usa.
    // Os que falam por SDK não têm host, e por isso não entram nesta conta.
    const noCodigo = new Set(hostsNoCodigo().keys());
    const orfaos = TERCEIROS.flatMap((t) => t.hosts).filter((h) => !noCodigo.has(h));
    expect(orfaos).toEqual([]);
  });

  it("quem recebe categoria especial diz o que recebe e de onde é", () => {
    for (const t of recebemCategoriaEspecial()) {
      expect(t.recebe.length).toBeGreaterThan(10);
      expect(t.sede).not.toBe("");
    }
    // A conta de 01/10/2026, depois de a MiniMax sair. Se subir, há coisa nova
    // a declarar na política e na ficha das lojas; se descer, alguém reduziu a
    // fila. Nos dois casos é mudança que precisa de ser vista, não absorvida em
    // silêncio.
    expect(recebemCategoriaEspecial()).toHaveLength(14);
  });

  it("quem fala por SDK está declarado à mão, porque a varredura não o vê", () => {
    const semHost = TERCEIROS.filter((t) => t.hosts.length === 0).map((t) => t.nome);
    expect(semHost).toEqual(["Resend", "Stripe"]);
  });
});

/**
 * A MiniMax saiu em 01/10/2026 e não volta por acidente.
 *
 * Ela era a **segunda da fila da visão**: a foto do corpo de uma paciente ia
 * para a China quando o OpenRouter falhava. A política da clínica já proibia
 * isso por escrito — está no comentário do ecrã de consentimento — e o código a
 * contrariava num `catch`. A proteção era o `AI_STRICT_MODE`, que **não estava
 * definido em produção**: existia só no `.env` local.
 *
 * Por isso o guarda não é um comentário a pedir cuidado, é um teste.
 */
describe("a MiniMax ficou fora", () => {
  it("**nenhum arquivo chama a API dela, nem lê a chave dela**", () => {
    const culpados = arquivosDoProduto()
      .filter((p) => /minimaxi\.chat|MINIMAX_API_KEY/.test(codigoSemComentarios(p)))
      .map((p) => path.relative(RAIZ, p).split(path.sep).join("/"));
    expect(culpados).toEqual([]);
  });

  it("a varredura lê arquivos de verdade — senão aprova o vazio", () => {
    expect(arquivosDoProduto().length).toBeGreaterThan(300);
  });

  it("e não está declarada como terceiro", () => {
    expect(TERCEIROS.map((t) => t.nome)).not.toContain("MiniMax");
  });
});
