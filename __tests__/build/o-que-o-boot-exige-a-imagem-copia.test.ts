/**
 * @jest-environment node
 *
 * Todo módulo que um script de boot exige, a imagem copia.
 *
 * A imagem de produção copia os scripts **um a um** — há uma linha `COPY` por
 * ficheiro no `Dockerfile`. Então acrescentar um `require('./outro')` a um
 * script de boot não basta: sem a sua própria linha, o módulo não existe no
 * container.
 *
 * E a falha é silenciosa do pior jeito. O `start.sh` corre cada seed com
 * `|| echo "... warning — check logs"`, então o container sobe, serve tráfego, e
 * o defeito fica numa linha de log que ninguém lê:
 *
 *     Error: Cannot find module './lab-categories'
 *
 * Foi exatamente isto, em 01/10/2026: `seed-lab-products.js` passou a exigir
 * `lab-categories.js`, a linha `COPY` não foi acrescentada, e o seed dos exames
 * deixou de correr em produção. Nada ficou vermelho — nem o build, nem o
 * deploy, nem um teste.
 */

import * as fs from "fs";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");

/** Os scripts que a imagem copia, lidos do próprio `Dockerfile`. */
function scriptsCopiados(): string[] {
  const docker = fs.readFileSync(path.join(RAIZ, "Dockerfile"), "utf8");
  return [...docker.matchAll(/^COPY\s+--from=\w+\s+\/app\/scripts\/([\w.-]+\.js)\s/gm)].map((m) => m[1]);
}

/** Os `require('./x')` de um script — só os relativos; `@prisma/client` não é nosso. */
function requiresLocais(arquivo: string): string[] {
  const src = fs.readFileSync(path.join(RAIZ, "scripts", arquivo), "utf8");
  return [...src.matchAll(/require\(\s*['"]\.\/([\w.-]+)['"]\s*\)/g)].map((m) =>
    m[1].endsWith(".js") ? m[1] : `${m[1]}.js`
  );
}

describe("a imagem de produção tem o que o boot exige", () => {
  it("a leitura do Dockerfile encontra scripts — senão aprova o vazio", () => {
    expect(scriptsCopiados().length).toBeGreaterThan(5);
  });

  it("**todo `require` local de um script copiado também está copiado**", () => {
    const copiados = new Set(scriptsCopiados());
    const faltam: string[] = [];

    for (const arquivo of copiados) {
      const caminho = path.join(RAIZ, "scripts", arquivo);
      if (!fs.existsSync(caminho)) continue; // o teste seguinte trata disto
      for (const dep of requiresLocais(arquivo)) {
        if (!copiados.has(dep)) faltam.push(`${arquivo} exige ./${dep}, que o Dockerfile não copia`);
      }
    }

    expect(faltam).toEqual([]);
  });

  it("todo script que o Dockerfile copia existe no repositório", () => {
    // O outro lado: uma linha `COPY` para um ficheiro apagado quebra o build da
    // imagem, e isso só aparece no deploy.
    const ausentes = scriptsCopiados().filter(
      (f) => !fs.existsSync(path.join(RAIZ, "scripts", f))
    );
    expect(ausentes).toEqual([]);
  });

  it("todo script que o `start.sh` corre está copiado pela imagem", () => {
    // O terceiro lado do mesmo buraco: o `start.sh` chama por caminho absoluto
    // (`node /app/scripts/x.js`), e um script não copiado morre igual.
    const start = fs.readFileSync(path.join(RAIZ, "start.sh"), "utf8");
    const chamados = [...start.matchAll(/node\s+\/app\/scripts\/([\w.-]+\.js)/g)].map((m) => m[1]);
    expect(chamados.length).toBeGreaterThan(3);
    const copiados = new Set(scriptsCopiados());
    expect(chamados.filter((c) => !copiados.has(c))).toEqual([]);
  });
});
