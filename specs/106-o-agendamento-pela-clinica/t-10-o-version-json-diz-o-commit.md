# T-10: O `version.json` diz qual commit está no ar

**Status:** 🟢 concluída (30/09)
**Depende de:** nenhuma
**Origem:** o QA online travou por não conseguir provar o deploy. A sugestão é do
agente de QA; o Bruno aprovou.

## O problema, que já tinha mordido três vezes

`public/version.json` tinha `version`, `timestamp` e `buildDate` — e **nenhum
commit**. O `buildDate` só diz que **algo** foi construído: um deploy que falha
no meio deixa o contêiner velho servindo, e o `buildDate` antigo parece novo
assim que alguém reconstrói por outro motivo.

Esta casa já tinha anotado duas vezes que ele mente. A consequência prática é que
todo QA de produção começava por **inferência** — ou por fabricar uma sessão de
staff só para achar um sinal comportamental do código novo. Foi exatamente onde o
QA online desta atividade parou: sem sessão, não havia como responder "qual
código está rodando?".

## O que ficou

`scripts/update-version.js`, que o `npm run build` já chamava, passa a escrever
`commit` e `commitShort`. Três fontes, em ordem de confiança:

1. As variáveis que o ambiente de build injeta — `SOURCE_COMMIT`,
   `COOLIFY_GIT_COMMIT_SHA`, `GIT_COMMIT_SHA`, `GITHUB_SHA`. **Ganham do git**,
   porque num contêiner o `git` pode apontar para um clone raso ou não existir, e
   quem sabe a verdade é quem clonou.
2. `git rev-parse HEAD` no diretório.
3. `null`.

Duas decisões que valem ser explícitas:

- **Uma variável que não é um SHA é recusada** e o git assume. Aceitar qualquer
  string poria `refs/heads/main` no lugar do commit, e o campo passaria a mentir
  com cara de verdade — pior que estar ausente.
- **Sem git e sem variável o build não cai.** Um `execSync` solto num contêiner
  sem git derruba o `npm run build` inteiro, e aí o deploy falha por causa do
  arquivo que existe para *provar* o deploy.

De brinde, o `buildDate` passou a ser o **mesmo** instante do `timestamp`: eram
dois `Date.now()` separados e podiam cair em milissegundos diferentes.

## O que isto muda no QA

A prova passa a ser uma requisição **pública**: sem sessão, sem token, sem
segredo.

```
curl -s https://bpr.clinic/version.json
```

Comparar o `commitShort` com o `git log --oneline` da `main` responde "o código
novo está no ar?" antes de qualquer outra medição — que é onde um QA de produção
deveria começar.

Não substitui a lista de deployments do Coolify: essa diz se o deploy **falhou**.
As duas juntas fecham a pergunta.

## Sobre expor o SHA

O commit vira público. Um SHA não dá acesso a nada — é o número do recibo, não a
chave. Muitos produtos expõem o seu. O teste fecha a lista de campos do arquivo
de propósito: no dia em que alguém acrescentar um campo ali, ele obriga a pensar
se aquilo pode ser público.

## Critérios de aceite

- [x] O arquivo traz `commit` e `commitShort`
- [x] O commit bate com o `HEAD` do diretório
- [x] As quatro variáveis de ambiente ganham do git
- [x] Variável que não é SHA é recusada
- [x] Sem git e sem variável, `null` e o build segue
- [x] Os campos antigos continuam, e `buildDate` é o instante do `timestamp`

## Provas

`__tests__/build/o-version-json-diz-o-commit.test.ts` — 11 cenários. Rodam o
script **de verdade** e leem o arquivo que ele escreve; nenhum lê código como
texto. O cenário do contêiner sem git roda num diretório temporário com o `PATH`
esvaziado, para não depender de onde o temporário está.

**Por mutação:** tirada a validação do SHA na variável, **1 falha** — a que
recusa o lixo, que é a única não-óbvia.

`NEXT_DIST_DIR=.build npm run build` escreveu o commit certo. Suíte completa:
**2828 testes, 190 suítes, verdes.** `tsc --noEmit` em 0.
