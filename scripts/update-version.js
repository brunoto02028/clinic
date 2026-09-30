const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionPath = path.join(__dirname, '..', 'public', 'version.json');

/**
 * Qual commit está no ar — a pergunta que ninguém conseguia responder de fora.
 *
 * Este arquivo tinha `version`, `timestamp` e `buildDate` e nenhum commit, e o
 * `buildDate` só diz que **algo** foi construído: um deploy que falhou no meio
 * deixa o contêiner velho servindo, e o `buildDate` antigo parece novo assim que
 * alguém reconstrói por outro motivo. Esta casa já anotou duas vezes que ele
 * mente, e todo QA de produção começava por inferência — ou por fabricar uma
 * sessão de staff só para achar um sinal comportamental do código novo.
 *
 * Com o commit aqui, a prova é uma requisição pública: sem sessão, sem token,
 * sem segredo. O SHA sozinho não dá acesso a nada; é o número do recibo.
 *
 * Três fontes, em ordem de confiança:
 *
 * 1. As variáveis que um CI injeta. **O Coolify não injeta nenhuma** — o log do
 *    build mostra que ele passa `COOLIFY_URL`, `COOLIFY_FQDN`, `COOLIFY_BRANCH`
 *    e `COOLIFY_RESOURCE_UUID`, e nada sobre o commit. Ficam para o GitHub
 *    Actions e para quem construir por outro caminho.
 * 2. **O diretório `.git`, lido como arquivo.** É esta que funciona no build:
 *    não há binário do git na imagem, e o `.dockerignore` foi estreitado para
 *    deixar passar `HEAD`, `refs/` e `packed-refs` — alguns bytes, sem história.
 * 3. O binário do git, que existe na máquina de quem desenvolve e resolve o
 *    caso do worktree, onde `.git` é um arquivo apontando para outro lugar.
 *
 * Duas tentativas minhas falharam antes desta, e as duas por eu não ter lido o
 * log do build: primeiro confiei no binário do git, que a imagem não tem; depois
 * declarei `ARG SOURCE_COMMIT`, que o Coolify não passa. O log dizia as duas
 * coisas.
 *
 * Se nenhuma responder, o campo vem `null` — **nunca** derruba o build, que é o
 * que um `execSync` solto num contêiner sem git faria.
 */
function commitDoBuild() {
  const daEnv =
    process.env.SOURCE_COMMIT ||
    process.env.COOLIFY_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (daEnv && /^[0-9a-f]{7,40}$/i.test(daEnv.trim())) return daEnv.trim();

  // Segunda fonte: ler o `.git` **como arquivo**, sem o binário do git.
  //
  // É esta que funciona no build — não há git instalado na imagem, e o
  // `.dockerignore` deixa passar só `HEAD`, `refs/` e `packed-refs`.
  const doDiretorioGit = lerCommitDoGit(path.join(__dirname, '..'));
  if (doDiretorioGit) return doDiretorioGit;

  // Terceira: o binário, que existe na máquina de quem desenvolve e resolve
  // também o worktree, onde `.git` é um arquivo apontando para outro lugar.
  try {
    const sha = execSync('git rev-parse HEAD', {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5000,
    }).trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

/**
 * O commit lido do diretório `.git`, sem executar nada.
 *
 * Um clone com HEAD destacado — o caso de um build — põe o SHA direto no
 * `HEAD`. Um clone com branch põe `ref: refs/heads/…`, e aí procura-se o
 * arquivo da ref e, se elas estiverem empacotadas, o `packed-refs`.
 */
function lerCommitDoGit(raiz) {
  try {
    const git = path.join(raiz, '.git');
    // Num worktree o `.git` é um **arquivo** com `gitdir: …`; aí esta fonte não
    // serve, e o binário resolve.
    if (!fs.existsSync(git) || !fs.statSync(git).isDirectory()) return null;

    const head = fs.readFileSync(path.join(git, 'HEAD'), 'utf8').trim();
    if (/^[0-9a-f]{40}$/i.test(head)) return head;

    const m = head.match(/^ref:\s*(.+)$/);
    if (!m) return null;
    const ref = m[1].trim();

    const solto = path.join(git, ref);
    if (fs.existsSync(solto)) {
      const sha = fs.readFileSync(solto, 'utf8').trim();
      if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
    }

    // Refs empacotadas: um clone recém-feito costuma estar assim.
    const empacotadas = path.join(git, 'packed-refs');
    if (fs.existsSync(empacotadas)) {
      for (const linha of fs.readFileSync(empacotadas, 'utf8').split('\n')) {
        const p = linha.trim().split(/\s+/);
        if (p.length === 2 && p[1] === ref && /^[0-9a-f]{40}$/i.test(p[0])) return p[0];
      }
    }
    return null;
  } catch {
    return null;
  }
}

const agora = Date.now();
const commit = commitDoBuild();

const versionData = {
  version: `1.0.${agora}`,
  timestamp: agora,
  buildDate: new Date(agora).toISOString(),
  commit,
  // Os sete primeiros, que é o que se compara a olho com `git log --oneline`.
  commitShort: commit ? commit.slice(0, 7) : null,
};

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log('Version updated:', versionData);
if (!commit) {
  console.warn(
    '[update-version] sem commit: nenhuma variavel de ambiente e nenhum git no diretorio. ' +
      'O version.json sai sem a prova de qual codigo subiu.'
  );
}
