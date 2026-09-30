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
 * Três fontes, em ordem de confiança, porque o build roda em lugares diferentes:
 * as variáveis que o Coolify e o GitHub Actions injetam, e o `git` do diretório
 * clonado. Se nenhuma responder, o campo vem `null` — **nunca** derruba o build,
 * que é o que um `execSync` solto faria num contêiner sem git.
 */
function commitDoBuild() {
  const daEnv =
    process.env.SOURCE_COMMIT ||
    process.env.COOLIFY_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (daEnv && /^[0-9a-f]{7,40}$/i.test(daEnv.trim())) return daEnv.trim();

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
