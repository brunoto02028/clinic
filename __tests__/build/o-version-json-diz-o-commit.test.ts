/**
 * @jest-environment node
 *
 * `public/version.json` tem de dizer **qual commit está no ar**.
 *
 * Ele tinha `version`, `timestamp` e `buildDate` e nenhum commit — e o
 * `buildDate` só diz que **algo** foi construído. Um deploy que falha no meio
 * deixa o contêiner velho servindo, e o `buildDate` antigo parece novo assim que
 * alguém reconstrói por outro motivo. Esta casa já anotou duas vezes que ele
 * mente, e todo QA de produção começava por inferência — ou por fabricar uma
 * sessão de staff só para achar um sinal comportamental do código novo.
 *
 * Estes testes rodam o script de verdade, num diretório temporário, e leem o
 * arquivo que ele escreve. Não leem o código como texto.
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const RAIZ = path.join(__dirname, "..", "..");
const SCRIPT = path.join(RAIZ, "scripts", "update-version.js");
const DESTINO = path.join(RAIZ, "public", "version.json");

/** Roda o script e devolve o que ele escreveu, repondo o arquivo depois. */
function rodar(env: Record<string, string | undefined> = {}) {
  const antes = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, "utf8") : null;
  try {
    execFileSync(process.execPath, [SCRIPT], {
      cwd: RAIZ,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
    return JSON.parse(fs.readFileSync(DESTINO, "utf8"));
  } finally {
    // O arquivo é versionado: um teste não pode deixá-lo mexido.
    if (antes !== null) fs.writeFileSync(DESTINO, antes);
  }
}

const SHA_DE_MENTIRA = "deadbeef1234567890abcdef1234567890abcdef";

describe("o commit vai no arquivo", () => {
  it("**escreve o commit do diretório**, que é o caso do build do Coolify", () => {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: RAIZ,
      encoding: "utf8",
    }).trim();
    const v = rodar();
    expect(v.commit).toBe(head);
  });

  it("o curto são os sete primeiros, que é o que se compara com `git log --oneline`", () => {
    const v = rodar();
    expect(v.commitShort).toBe(String(v.commit).slice(0, 7));
    expect(v.commitShort).toHaveLength(7);
  });

  it("os campos antigos continuam lá — quem já os lê não pode quebrar", () => {
    const v = rodar();
    expect(typeof v.timestamp).toBe("number");
    expect(v.version).toBe(`1.0.${v.timestamp}`);
    // O `buildDate` tem de ser o **mesmo** instante do timestamp. Antes eram
    // dois `Date.now()` separados, e podiam cair em milissegundos diferentes.
    expect(new Date(v.buildDate).getTime()).toBe(v.timestamp);
  });
});

describe("de onde o commit pode vir", () => {
  it.each([
    ["SOURCE_COMMIT", "o que o Coolify injeta"],
    ["GITHUB_SHA", "o que o GitHub Actions injeta"],
    ["COOLIFY_GIT_COMMIT_SHA", "a variante nomeada"],
    ["GIT_COMMIT_SHA", "a genérica"],
  ])("%s ganha do git — %s", (chave) => {
    // A variável tem de ganhar: num build em contêiner o `git` pode apontar
    // para um clone raso, ou nem existir, e quem sabe a verdade é quem clonou.
    const v = rodar({ [chave]: SHA_DE_MENTIRA });
    expect(v.commit).toBe(SHA_DE_MENTIRA);
  });

  it("**variável com lixo é recusada** e o git assume", () => {
    // Aceitar qualquer string poria `branch-do-fulano` no lugar do commit, e o
    // campo passaria a mentir com cara de verdade — pior que estar ausente.
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: RAIZ,
      encoding: "utf8",
    }).trim();
    const v = rodar({ SOURCE_COMMIT: "refs/heads/main" });
    expect(v.commit).toBe(head);
  });

  it("um SHA curto na variável é aceito — sete caracteres já identificam", () => {
    const v = rodar({ SOURCE_COMMIT: "ab5c159" });
    expect(v.commit).toBe("ab5c159");
    expect(v.commitShort).toBe("ab5c159");
  });
});

describe("o `.git` lido como arquivo — o caminho que só existe no build", () => {
  /**
   * Na máquina de quem desenvolve isto nunca corre: o binário do git existe e
   * atende antes. **No build é o único caminho** — não há git na imagem, e o
   * `.dockerignore` deixa passar só `HEAD`, `refs/` e `packed-refs`.
   *
   * Por isso os cenários montam um `.git` de mentira num diretório temporário,
   * com o `PATH` esvaziado para o binário não salvar o teste. É o que o build
   * vê, e não o que esta máquina vê.
   */
  const SHA = "1234567890abcdef1234567890abcdef12345678";
  const NL = "\n";

  function rodarSemBinario(montar: (raiz: string) => void) {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "gitdir-"));
    fs.mkdirSync(path.join(temp, "scripts"));
    fs.mkdirSync(path.join(temp, "public"));
    fs.copyFileSync(SCRIPT, path.join(temp, "scripts", "update-version.js"));
    montar(temp);

    const env: Record<string, string | undefined> = { ...process.env, PATH: "" };
    for (const k of ["SOURCE_COMMIT", "GITHUB_SHA", "COOLIFY_GIT_COMMIT_SHA", "GIT_COMMIT_SHA"]) {
      delete env[k];
    }
    execFileSync(process.execPath, [path.join(temp, "scripts", "update-version.js")], {
      cwd: temp,
      env: env as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
    const v = JSON.parse(fs.readFileSync(path.join(temp, "public", "version.json"), "utf8"));
    fs.rmSync(temp, { recursive: true, force: true });
    return v;
  }

  const comGit = (montar: (git: string) => void) =>
    rodarSemBinario((raiz) => {
      const git = path.join(raiz, ".git");
      fs.mkdirSync(git);
      montar(git);
    });

  it("**HEAD destacado** — o SHA direto no arquivo, que é o caso de um clone de build", () => {
    const v = comGit((git) => fs.writeFileSync(path.join(git, "HEAD"), SHA + NL));
    expect(v.commit).toBe(SHA);
    expect(v.commitShort).toBe(SHA.slice(0, 7));
  });

  it("**HEAD apontando para uma branch**, com a ref solta", () => {
    const v = comGit((git) => {
      fs.writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main" + NL);
      fs.mkdirSync(path.join(git, "refs", "heads"), { recursive: true });
      fs.writeFileSync(path.join(git, "refs", "heads", "main"), SHA + NL);
    });
    expect(v.commit).toBe(SHA);
  });

  it("**ref empacotada** — um clone recém-feito costuma estar assim", () => {
    // Sem esta leitura, um clone com `packed-refs` e sem `refs/heads/main` daria
    // `null`, e o campo voltaria a mentir por omissão.
    const v = comGit((git) => {
      fs.writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/main" + NL);
      fs.writeFileSync(
        path.join(git, "packed-refs"),
        "# pack-refs with: peeled fully-peeled sorted" + NL + SHA + " refs/heads/main" + NL
      );
    });
    expect(v.commit).toBe(SHA);
  });

  it("branch com barra no nome não confunde a leitura", () => {
    const v = comGit((git) => {
      fs.writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/brunoto02028/app_clinic" + NL);
      fs.mkdirSync(path.join(git, "refs", "heads", "brunoto02028"), { recursive: true });
      fs.writeFileSync(path.join(git, "refs", "heads", "brunoto02028", "app_clinic"), SHA + NL);
    });
    expect(v.commit).toBe(SHA);
  });

  it("**ref que não existe não vira commit**", () => {
    // Escrever qualquer coisa ali seria pior que deixar vazio: mentiria com
    // cara de verdade.
    const v = comGit((git) => fs.writeFileSync(path.join(git, "HEAD"), "ref: refs/heads/sumida" + NL));
    expect(v.commit).toBeNull();
  });

  it("**`.git` que é arquivo, como num worktree**, não estoura", () => {
    // É o caso desta máquina: `.git` é um ponteiro para outro lugar. Esta fonte
    // não serve, e sem o binário o campo fica nulo — sem derrubar o build.
    const v = rodarSemBinario((raiz) =>
      fs.writeFileSync(path.join(raiz, ".git"), "gitdir: /outro/lugar" + NL)
    );
    expect(v.commit).toBeNull();
    expect(typeof v.timestamp).toBe("number");
  });
});

describe("o caminho que produção usa de verdade", () => {
  /**
   * O campo saiu `null` no primeiro deploy, e a causa era minha.
   *
   * O script procura o `git` como segunda fonte — e **não há git no build**: o
   * `.dockerignore` exclui o `.git` na primeira linha, de propósito, para a
   * imagem não carregar o histórico. E o `ARG SOURCE_COMMIT` não estava
   * declarado, então o build arg do Coolify não chegava ao ambiente do `RUN`.
   *
   * Três fontes, e em produção só uma podia funcionar. Este teste guarda a que
   * sobra.
   */
  const fs = require("fs");
  const path = require("path");
  const RAIZ = path.join(__dirname, "..", "..");
  const dockerfile = () => fs.readFileSync(path.join(RAIZ, "Dockerfile"), "utf8");

  it("**o `.dockerignore` deixa passar o `HEAD` e barra a história**", () => {
    // A troca que fez o campo funcionar: era `.git` inteiro e agora é estreita.
    // Se alguém voltar a excluir o `.git` de uma vez, o campo volta a `null` —
    // e este teste cai antes de isso chegar a produção.
    const linhas = fs
      .readFileSync(path.join(RAIZ, ".dockerignore"), "utf8")
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l && !l.startsWith("#"));

    for (const largo of [".git", ".git/", ".git/**", ".git/*"]) {
      expect(linhas).not.toContain(largo);
    }
    // E a história continua fora da imagem, que é o motivo de a exclusão existir.
    expect(linhas).toContain(".git/objects");
    expect(linhas).toContain(".git/logs");
  });

  it("**o Dockerfile declara e exporta `SOURCE_COMMIT`**", () => {
    const d = dockerfile();
    expect(d).toMatch(/^ARG SOURCE_COMMIT$/m);
    expect(d).toMatch(/^ENV SOURCE_COMMIT=\$\{SOURCE_COMMIT\}$/m);
  });

  it("**a exportação vem antes do build** — depois dele não serve para nada", () => {
    const d = dockerfile();
    const env = d.indexOf("ENV SOURCE_COMMIT=");
    const build = d.indexOf("npm run build");
    expect(env).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(-1);
    expect(env).toBeLessThan(build);
  });

  it("o script procura essa variável primeiro", () => {
    const script = fs.readFileSync(path.join(RAIZ, "scripts", "update-version.js"), "utf8");
    const varr = script.indexOf("SOURCE_COMMIT");
    const git = script.indexOf("git rev-parse");
    expect(varr).toBeGreaterThan(-1);
    expect(varr).toBeLessThan(git);
  });
});

describe("o que não pode acontecer", () => {
  it("**sem git e sem variável, o build não cai**", () => {
    // Um `execSync` solto num contêiner sem git derruba o `npm run build`
    // inteiro — e aí o deploy falha por causa do arquivo que existe para
    // *provar* o deploy.
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "semgit-"));
    const pastaScripts = path.join(temp, "scripts");
    const pastaPublic = path.join(temp, "public");
    fs.mkdirSync(pastaScripts);
    fs.mkdirSync(pastaPublic);
    fs.copyFileSync(SCRIPT, path.join(pastaScripts, "update-version.js"));

    const env = { ...process.env };
    for (const k of ["SOURCE_COMMIT", "GITHUB_SHA", "COOLIFY_GIT_COMMIT_SHA", "GIT_COMMIT_SHA"]) {
      delete (env as any)[k];
    }
    // `PATH` esvaziado: é o que simula o contêiner sem git, sem depender de o
    // diretório temporário estar ou não dentro de um repositório.
    execFileSync(process.execPath, [path.join(pastaScripts, "update-version.js")], {
      cwd: temp,
      env: { ...env, PATH: "" },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });

    const v = JSON.parse(fs.readFileSync(path.join(pastaPublic, "version.json"), "utf8"));
    expect(v.commit).toBeNull();
    expect(v.commitShort).toBeNull();
    // E os campos que o app já consome continuam preenchidos.
    expect(typeof v.timestamp).toBe("number");
    fs.rmSync(temp, { recursive: true, force: true });
  });

  it("o arquivo é JSON legível por uma requisição pública, sem nada sensível", () => {
    const v = rodar();
    // A lista é fechada de propósito: o dia em que alguém acrescentar um campo
    // aqui, este teste obriga a pensar se ele pode ser público.
    expect(Object.keys(v).sort()).toEqual(
      ["buildDate", "commit", "commitShort", "timestamp", "version"].sort()
    );
  });
});
