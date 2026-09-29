/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";
import { raiz, semComentarios } from "../helpers/codigo";

/**
 * Nenhuma tela importa pacote nativo direto (29/09/2026).
 *
 * ## O que isto custou antes de existir
 *
 * `@stripe/stripe-react-native` importa `codegenNativeComponent`, interno do
 * React Native e inexistente no web. Uma tela importando o pacote direto não
 * quebra a tela: **quebra o bundle web inteiro**.
 *
 * Isso derrubou o `eas update` de 29/09 — iOS e Android empacotaram a 99,9% e o
 * web falhou, levando o comando junto — e, antes disso, impediu o QA de abrir
 * **qualquer** tela do app no navegador em três tarefas seguidas: a 102 T-8,
 * T-9 e T-10 saíram todas com "a tela do app não foi medida". O diagnóstico
 * corrente era cache do Metro. Não era. Era isto, todas as vezes.
 *
 * A porta é `src/lib/stripe-nativo.ts`, com o irmão `.web.ts` que o Metro
 * escolhe no navegador.
 */

const NATIVOS = ["@stripe/stripe-react-native"];

describe("o bundle web continua compilando", () => {
  const telas: { nome: string; codigo: string }[] = [];
  const andar = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (/\.tsx?$/.test(e.name)) {
        telas.push({
          nome: path.relative(raiz, p).split(path.sep).join("/"),
          codigo: semComentarios(fs.readFileSync(p, "utf8")),
        });
      }
    }
  };
  andar(path.join(raiz, "mobile", "app"));

  it("a varredura encontra as telas", () => {
    // Uma varredura que não acha nada passa sempre.
    expect(telas.length).toBeGreaterThan(30);
  });

  it("**nenhuma tela importa um pacote só-nativo direto**", () => {
    const culpadas = telas
      .filter((t) => NATIVOS.some((n) => t.codigo.includes(`from "${n}"`)))
      .map((t) => t.nome);
    expect(culpadas).toEqual([]);
  });

  it("**e a porta por plataforma existe, com as duas metades**", () => {
    // Sem o `.web.ts`, o Metro cai no arquivo nativo e o problema volta igual.
    const nativo = path.join(raiz, "mobile", "src", "lib", "stripe-nativo.ts");
    const web = path.join(raiz, "mobile", "src", "lib", "stripe-nativo.web.ts");
    expect(fs.existsSync(nativo)).toBe(true);
    expect(fs.existsSync(web)).toBe(true);
    expect(fs.readFileSync(web, "utf8")).not.toContain("@stripe/stripe-react-native");
  });

  it("**e o substituto do web não finge que pagou**", () => {
    // Ele devolve o mesmo formato de erro que a tela já sabe ler.
    const web = fs.readFileSync(
      path.join(raiz, "mobile", "src", "lib", "stripe-nativo.web.ts"),
      "utf8"
    );
    expect(web).toMatch(/error: \{/);
    expect(web).toMatch(/Paying happens in the app/);
  });
});
