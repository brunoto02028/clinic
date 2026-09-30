/**
 * @jest-environment node
 *
 * Se a lista pede um módulo, o detalhe dela também pede.
 *
 * Eu cometi este erro **duas vezes no mesmo dia**:
 *
 * 1. Movi `/api/patient/clinical-notes` para `mod_clinical_notes` e esqueci
 *    `/api/soap-notes/[id]` e o PDF. A lista negava e a nota abria por id.
 * 2. Fechei `/api/patient/reports` com `mod_records` e esqueci
 *    `/api/patient/reports/[id]`. O QA achou: lista 403, relatório 200 com o
 *    HTML inteiro.
 *
 * Nos dois casos o botão sumia do menu e a porta ficava aberta. Corrigir cada um
 * não impede o terceiro; isto impede.
 *
 * O teste **varre** as rotas em vez de listar as conhecidas — uma lista escrita
 * à mão tem exatamente o defeito que ela existe para evitar.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const API = path.join(RAIZ, "app", "api");

/** O módulo que uma rota exige, ou null. Comentários fora: eles citam chaves. */
function moduloDaRota(arquivo: string): string | null {
  const bruto = fs.readFileSync(arquivo, "utf8");
  const codigo = bruto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  const m =
    codigo.match(/patientGate\(\s*\{[^}]*?module:\s*"([a-z_]+)"/) ??
    codigo.match(/assertModuleAccess\([^,]+,\s*"([a-z_]+)"/);
  return m ? m[1] : null;
}

/** Toda pasta de rota que tem um `route.ts` e um filho dinâmico com outro. */
function paresListaDetalhe(): Array<{ lista: string; detalhe: string }> {
  const pares: Array<{ lista: string; detalhe: string }> = [];
  const anda = (dir: string) => {
    let filhos: string[];
    try {
      filhos = fs.readdirSync(dir);
    } catch {
      return;
    }
    const temRota = filhos.includes("route.ts");
    for (const nome of filhos) {
      const p = path.join(dir, nome);
      if (!fs.statSync(p).isDirectory()) continue;
      // `[id]`, `[slug]`, `[...path]` — o detalhe de uma lista.
      if (temRota && /^\[.+\]$/.test(nome) && fs.existsSync(path.join(p, "route.ts"))) {
        pares.push({
          lista: path.join(dir, "route.ts"),
          detalhe: path.join(p, "route.ts"),
        });
      }
      anda(p);
    }
  };
  anda(API);
  return pares;
}

const rel = (p: string) => p.slice(RAIZ.length + 1).split(path.sep).join("/");

/**
 * Onde o detalhe legitimamente não repete o módulo da lista.
 *
 * Cada linha precisa de um porquê — uma exceção sem motivo vivo é um buraco
 * com permissão. Vazio por enquanto, e que continue assim.
 */
const EXCECOES = new Map<string, string>();

describe("a varredura encontra pares", () => {
  it("acha pares de lista e detalhe — senão aprova o vazio", () => {
    // Régua quebrada aprova tudo: se a estrutura de rotas mudar, este cai
    // primeiro, em vez de o teste seguinte passar por não ter o que comparar.
    expect(paresListaDetalhe().length).toBeGreaterThan(10);
  });

  it("os dois casos que me morderam estão entre os pares varridos", () => {
    const todos = paresListaDetalhe().map((p) => rel(p.detalhe));
    expect(todos).toContain("app/api/patient/reports/[id]/route.ts");
    expect(todos).toContain("app/api/soap-notes/[id]/route.ts");
  });
});

describe("o detalhe não fica para trás", () => {
  it("**toda lista que pede módulo tem detalhe que pede o mesmo**", () => {
    const erros: string[] = [];
    for (const { lista, detalhe } of paresListaDetalhe()) {
      const daLista = moduloDaRota(lista);
      if (!daLista) continue; // a lista não é governada: nada a exigir do filho
      if (EXCECOES.has(rel(detalhe))) continue;
      const doDetalhe = moduloDaRota(detalhe);
      if (doDetalhe === null) {
        erros.push(`${rel(detalhe)}: a lista pede ${daLista} e o detalhe não pede nada`);
      } else if (doDetalhe !== daLista) {
        erros.push(`${rel(detalhe)}: a lista pede ${daLista} e o detalhe pede ${doDetalhe}`);
      }
    }
    expect(erros).toEqual([]);
  });

  it("nenhuma exceção sobrevive sem motivo escrito", () => {
    for (const [rota, motivo] of EXCECOES) {
      expect(motivo.trim().length).toBeGreaterThan(20);
      expect(fs.existsSync(path.join(RAIZ, rota))).toBe(true);
    }
  });
});
