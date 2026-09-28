# QA — Atividade 097 (entrar com Google e com Apple)

**Data:** 28/09/2026
**Onde:** dev server deste worktree em `http://localhost:4177`
(`app_clinic`, branch `brunoto02028/app_clinic`), banco local.
**Suite:** `npx jest` — **141 suítes, 1979 testes, todos passando**.
**Tipos:** `npm run typecheck` (web) e `npx tsc --noEmit` (mobile) — **zero erros**.

> **Nenhum token aparece neste relatório.** Nem trecho, nem tamanho de amostra.
> Onde foi preciso provar que um token existe, o que está registrado é o `aud`
> e o veredito.

---

## O que **não** foi executado, e por quê

Isto vem antes do resto de propósito. Três coisas não têm como ser testadas
daqui, e nenhuma delas está marcada como "passou":

| o que | por que não dá |
|---|---|
| Um ID token **real** do Google/Apple ponta a ponta | exige um aparelho com o build novo e uma conta Google/Apple de verdade fazendo a viagem |
| Os botões no aplicativo (T-3, T-4) | dependência **nativa**: só existem depois do build |
| O Google na web ligado (T-5, cenários 5.2 a 5.7) | falta o `GOOGLE_CLIENT_SECRET` no Coolify, que é seu |

O que dava para provar sem eles foi provado — inclusive a parte que mais
importa, que é a **recusa**. Ver "a prova da assinatura" abaixo.

---

## A prova da assinatura (cenário 1.5, "o que mais importa")

`__tests__/mobile/o-aud-de-outro-aplicativo.test.ts` roda com **assinatura de
verdade**: um par de chaves RSA nasce no teste, assina tokens, e a única coisa
fingida é de onde vêm as chaves públicas. Não é uma asserção sobre o texto do
código; é o verificador fazendo o trabalho dele.

| cenário | token | resultado |
|---|---|---|
| 1.1 (equivalente) | `aud` = o nosso client ID Web | **aceito**, `sub` e e-mail lidos |
| **1.5** | `aud` = `99999-outro-app.apps.googleusercontent.com` | **recusado** |
| 1.4 | `exp` uma hora no passado | **recusado** |
| — | `iss` = `accounts.exemplo.com` | **recusado** |
| **1.3** | assinado certo, `sub` trocado depois | **recusado** |
| — | `alg: none` com payload perfeito | **recusado** |
| — | `aud` = client ID **iOS**, também configurado | **aceito** (um cliente por plataforma, a mesma pessoa) |

---

## T-1 — O backend valida

| # | cenário | como foi medido | resultado |
|---|---|---|---|
| 1.1 | token válido de paciente com `Account` | teste de comportamento com prisma em memória | **passou** — mesma conta, `novo: false` |
| 1.2 | formato da resposta | `lib/social-signin-http.ts` é o mesmo `signAccessToken` + `issueRefreshToken` do login por senha | **passou** |
| 1.3 | token adulterado | assinatura real | **passou** (401) |
| 1.4 | token expirado | assinatura real | **passou** (401) |
| 1.5 | `aud` de outro aplicativo | assinatura real | **passou** (401) |
| 1.6 | `email_verified: false` | unitário | **passou** — `email_nao_verificado` |
| 1.7 | `nonce` diferente | unitário, três casos | **passou** — token com nonce e nenhum pedido, pedido e nenhum no token, e os dois iguais |
| 1.8 | **pessoa gerida** | comportamento, com `Account` do Google já ligado | **passou** — 401 com a frase genérica do login por senha |
| 1.9 | quem nunca aceitou os termos | comportamento | **passou** — `consentAcceptedAt` não é escrito em lugar nenhum |
| 1.10 | 11 tentativas no mesmo minuto | `curl` de verdade contra `:4177` | **passou** — ver abaixo |
| 1.11 | token em log | leitura do código + o que vai para `sysLog` é `{ reason, ip }` | **passou** |

**1.10, medido:**

```
 1..10 -> HTTP/1.1 401 Unauthorized
11     -> HTTP/1.1 429 Too Many Requests   retry-after: 59
12     -> HTTP/1.1 429 Too Many Requests   retry-after: 59
```

**As outras respostas de porta, medidas:**

```
POST /api/mobile/auth/google  {}                    -> 400  {"error":"Sign-in token is required"}
POST /api/mobile/auth/google  {"idToken":"lixo"}    -> 401  {"error":"Could not verify your sign-in. Please try again."}
POST /api/mobile/auth/apple   (sem APPLE_CLIENT_ID) -> 503  {"error":"Sign-in is not available right now"}
GET  /api/mobile/auth/providers  (sem bearer)       -> 401
POST /api/mobile/auth/google/link (sem bearer)      -> 401
```

O 401 do token inválido **não diz o motivo** — nem "aud", nem "assinatura", nem
"expirado". Dizer isso ensina a quem está tentando o que ajustar.

---

## T-2 — O vínculo (caminho **não vincular**, o da sua spec)

| # | cenário | resultado |
|---|---|---|
| 2.1 | e-mail de paciente que já existe, sem `Account` | **passou** — `409 account_exists`, com `hasPassword` |
| 2.2 | e o que não acontece | **passou** — nenhuma sessão, nenhuma conta, nenhum `Account` criado |
| 2.3 | entrar com a senha e vincular | **passou** (comportamento) — o `Account` nasce com o `sub`, e vai para o log de auditoria |
| 2.4 | entrar com Google depois | **passou** (comportamento) |
| 2.5 | e-mail novo | **passou** — `User` + `Account` na **mesma escrita**, papel `PATIENT`, sem consentimento aceito |
| 2.6 | e-mail trocado no Google depois | **passou** — continua entrando na mesma conta; a chave é o `sub` |
| 2.7 | web e app respondem igual | **passou** — a web recusa com `OAuthAccountNotLinked` e a tela mostra a mesma frase (captura abaixo) |
| 2.8 | desvincular tendo senha | **passou** |
| 2.9 | desvincular **sem** senha | **passou** — recusado, `no_password`; e com dois provedores ligados, soltar um é permitido |

**Extra que não estava na spec e passou:** o mesmo Google não pode apontar para
duas contas (`provider_taken`). Seria a mesma pessoa com dois prontuários, e o
login passaria a depender de qual linha o banco devolvesse primeiro.

**Captura:** `screenshots/login-oauth-nao-vinculado.png` —
`/login?error=OAuthAccountNotLinked` mostrando *"There is already an account
with this email. Sign in with your password once, and we will connect Google
for next time."*

`?error=AccountDeactivated` também foi conferido na tela e mostra *"Account is
deactivated. Please contact support."* — **antes desta atividade nenhum dos
dois aparecia**: o servidor mandava o código e a tela não lia.

---

## T-3 e T-4 — O aplicativo

**Não executado.** Dependência nativa: só existe depois do build.

O que dá para afirmar agora, por leitura e por tipo:

- `npx tsc --noEmit` do `mobile` — zero erros.
- `npx expo config --type introspect` resolve os dois plugins:
  `usesAppleSignIn: true` e o `CFBundleURLSchemes` com o client ID iOS
  invertido.
- Desistir do Google/Apple **não** vira mensagem de erro (`SocialCancelado`).
- O SDK do Google é carregado sob demanda — importar no topo derrubaria o
  bundle da web e o Expo Go.
- O app **sai da conta do Google antes de entrar**; sem isso o SDK devolve a
  última conta usada sem perguntar nada, e quem empresta o telefone entra na
  conta de outra pessoa.
- O botão do Google **não aparece no Android** (ver o plano: não há keystore,
  logo não há SHA-1, logo o SDK responderia `DEVELOPER_ERROR`).

**Cenário 3.2 continua sendo o perigoso** — o `.aab` do teste interno do Play,
onde o SHA-1 da App signing key aparece ou não. Ele nem pode acontecer ainda.

**Cenário 4.2 (o nome que a Apple só manda uma vez)** está implementado do
jeito certo: o nome vem no corpo da requisição e é usado **só quando a conta
nasce**. Numa conta que já existe ele é ignorado — vindo do cliente, não é
prova de nada, e deixá-lo sobrescrever seria deixar o app renomear um paciente.
Testado com prisma em memória; falta a viagem real.

---

## T-5 — O Google na web

| # | cenário | resultado |
|---|---|---|
| 5.1 | `/api/auth/providers` antes | **passou** — só `credentials`, medido em `:4177` mesmo com `GOOGLE_CLIENT_ID` presente no `.env` |
| 5.2–5.7 | com as variáveis | **não executado** — falta o `GOOGLE_CLIENT_SECRET` |

O 5.1 vale mais do que parece: com o Client ID presente e o segredo ausente, o
provedor **continua sem ser montado**. É o comportamento certo — um botão que
leva a `client_id is required` é pior que nenhum botão.

---

## T-6 — Privacidade e exclusão

| # | cenário | resultado |
|---|---|---|
| 6.1 | a política tem a seção | **passou** — dentro de "O Aplicativo", nas duas línguas |
| 6.2 | o que ela diz | **passou** — nome, e-mail e foto; e, explícito, o que **não** é pedido: e-mail, agenda, arquivos, contatos |
| 6.3 | excluir a conta apaga os `Account` | **passou** — `lib/account-closure.ts` passou a apagá-los dentro da mesma transação |
| 6.4 | token revogado na Apple | **não executado, e não implementado** — ver abaixo |
| 6.5 | o prontuário | **passou** — intacto, sob retenção (comportamento de 089/090, inalterado) |
| 6.6 | versão da política | não se aplica — a política não é versionada como os termos |

### 6.4 é uma pendência real, e ela é sua (094 G-8)

A Apple exige que quem oferece *Sign in with Apple* **e** exclusão de conta
**revogue o token do lado dela**. Isso é uma chamada assinada com uma chave
`.p8` que só você pode gerar. Sem ela o resto da exclusão funciona — acesso
encerrado, vínculos apagados, prontuário retido —, mas o aviso à Apple não sai,
e isso é item de revisão da loja.

---

## Defeitos encontrados no caminho, e corrigidos

1. **A tela de login da web nunca leu o `?error=`.** `lib/auth-options.ts` já
   mandava `/login?error=AccessDenied` e `?error=AccountDeactivated`, e a
   pessoa voltava ao formulário vazio, **sem uma frase**, achando que tinha
   errado a senha. Corrigido, nas duas línguas.
2. **O Google entrava numa conta existente só porque o e-mail batia** — o
   contrário da regra 2 da sua spec. Corrigido, e agora a web e o app recusam
   igual.
3. **`corsJson` não sabia mandar cabeçalho**, então um 429 não conseguia dizer
   quando voltar. Corrigido, e o `Retry-After` foi medido.
4. **Fechar a conta deixava o `Account` do provedor para trás**, amarrando o
   `sub` daquela pessoa a uma conta morta. Corrigido.

## Veredito

**Aprovado no que dá para executar daqui.** T-1, T-2, T-5 (5.1) e T-6 (menos o
6.4) estão provados. T-3, T-4 e o restante do T-5 ficam **não executados**,
esperando o build e as variáveis no Coolify — e devem ser reexecutados como QA
online depois do deploy, junto com um paciente de teste identificado.
