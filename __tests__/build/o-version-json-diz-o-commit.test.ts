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

  it("**o `.dockerignore` continua excluindo o `.git`** — a premissa", () => {
    // Se um dia o `.git` entrar na imagem, este teste cai e alguém relê o
    // resto — e aí a exclusão do histórico terá sido desfeita sem querer.
    const ignore = fs.readFileSync(path.join(RAIZ, ".dockerignore"), "utf8");
    expect(ignore.split("\n").map((l: string) => l.trim())).toContain(".git");
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
