# Como rodar este QA sem atrapalhar o outro

Dois agentes medindo o mesmo worktree ao mesmo tempo brigam por duas coisas, e as
duas quebram a medição em silêncio.

## A porta

Worktrees paralelos disputam a **:4000**, e um QA que mede a :4000 pode estar
medindo outro checkout. Cada QA sobe o seu:

```
npm run dev -- -p <a porta que te disseram>
```

E **confirma** que é este código antes de medir — pelo log do processo que você
mesmo subiu, não por um `/api/health` que qualquer servidor responde igual.

## O `.next`

Dois servidores de desenvolvimento no mesmo `.next` se sobrescrevem, e um
`npm run build` no meio deixa o outro com `MODULE_NOT_FOUND`. Quem for o segundo
usa a sua própria pasta:

```
NEXT_DIST_DIR=.next-qa-<seu nome> npm run dev -- -p <porta>
```

Isso faz o Next reescrever o `tsconfig.json` — e **`NEXT_DIST_DIR` não isola o
`tsconfig`**: ele é um arquivo só, e o Next **troca** a linha que está lá pela
sua, em vez de acrescentar. Quem subir depois apaga a linha do outro sem avisar.

Consequência prática: o `git checkout tsconfig.json` do fim apaga a linha do
outro QA se ele ainda estiver rodando. A linha só afeta o `tsc`, não o dev
server — então o outro continua medindo, mas um `npm run typecheck` dele vai
mostrar ruído de tipo que **não é código**.

A regra segura:

- **quem terminar primeiro** reverte o `tsconfig.json` e apaga a sua pasta;
- **quem terminar depois** confere se a linha dele voltou antes de rodar `tsc`,
  e reverte de novo no fim;
- e ninguém comita o `tsconfig.json` — use `git add` por caminho, nunca `-A` na
  raiz, ou a linha de QA vai junto para o commit.

## O navegador: **um Playwright MCP, um browser**

Pior que o cookie, e menos óbvio: o Playwright MCP é **um processo de navegador
só**, e "aba atual" é estado **global** dele. Dois QAs em paralelo não podem os
dois usar o MCP — um `browser_take_screenshot` seu pode fotografar a aba do
outro, porque ele selecionou a dele no meio do seu comando. A foto sai, o
comando não falha, e você anexa ao relatório a tela de outra medição.

Aconteceu em 27/09/2026, entre os QAs da 095.

**Combinem quem fica com o MCP.** Quem não ficar dirige um Chromium próprio:

```js
const { chromium } = require("playwright"); // do node_modules do projeto
const ctx = await chromium.launchPersistentContext(
  "<seu scratchpad>/browser",           // userDataDir próprio
  { headless: true }
);
```

Browser separado, cookie separado, aba separada — e aí a seção de baixo vira
desnecessária para esse QA.

## O cookie do navegador

**Cookie de sessão não tem porta.** O `next-auth.session-token` é gravado por
**host**, então `localhost:4331` e `localhost:4332` compartilham o mesmo — quem
logar por último derruba a sessão do outro **em silêncio**: a tela do primeiro
vira login, ou pior, vira a clínica errada e ele mede outra coisa achando que é
a dele.

O Playwright MCP é um navegador só, o que torna isso certo de acontecer com dois
QAs ao mesmo tempo.

A saída é usar **hosts diferentes**, porque aí os potes de cookie são
diferentes:

| quem | host |
|---|---|
| o primeiro QA | `http://127.0.0.1:<porta dele>` |
| o segundo QA | `http://localhost:<porta dele>` |

Combine qual é qual **antes** de logar. Se os dois forem para o mesmo host,
colide de novo — e a colisão não avisa.

Isto já tinha mordido o QA da 093, que anotou *"cookie não tem porta"* depois de
uma medição sair errada. Agora está aqui, antes.

## O banco

É o mesmo Postgres. Use prefixo próprio nos dados de teste (`qaNNN.*`), e
**nunca** toque em paciente real — nem para ler, além do necessário.

Ao terminar, diga no relatório o que ficou no banco e como apagar de uma vez.
