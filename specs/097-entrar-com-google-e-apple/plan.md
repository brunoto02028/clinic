# Atividade 097 — Entrar com Google (e com Apple)

**Aberta em:** 28/09/2026
**Origem:** a spec que o Bruno escreveu em 27/09 ("BPR App — Login com Google"),
adaptada ao que este sistema já tem. O Google Cloud Console já está configurado
por ele, projeto **RB Rehab** (`rb-rehab`).

## O que a spec original não sabia sobre este sistema

Quatro coisas, e elas mudam o trabalho:

**1. O login com Google já existe no código.** `lib/auth-options.ts` tem
`GoogleProvider` do NextAuth, ligado por `GOOGLE_CLIENT_ID` e
`GOOGLE_CLIENT_SECRET`. Ele some da tela quando as variáveis faltam — e **faltam
em produção**: `/api/auth/providers` responde só `credentials`. Ou seja, metade
do trabalho da web é **ligar**, não escrever.

**2. `AuthIdentity` não precisa existir.** O `Account` do NextAuth já é ela:
`provider` + `providerAccountId` (que é o `sub`), com `@@unique([provider,
providerAccountId])`. Criar uma segunda tabela seria ter dois lugares dizendo
quem é a mesma pessoa.

**3. O app não usa sessão do NextAuth.** Ele tem token próprio —
`signAccessToken`, `issueRefreshToken`, `rotateRefreshToken` em
`lib/mobile-tokens.ts` — e rotas `/api/mobile/login`, `/register`, `/refresh`,
`/logout`. O endpoint novo é `/api/mobile/auth/google`, e ele emite **o mesmo
par de tokens** que o login por senha emite. Nada de inventar sessão nova.

**4. O cadastro próprio já existe** (`/api/mobile/register`). Então "paciente
novo cria conta pelo Google" não é decisão de produto nova: é o caminho que já
existe, por outra porta.

## O que foi feito em 28/09

**As seis tarefas estão implementadas.** O que falta é seu, e é configuração —
está na tabela do fim.

| T-N | o que ficou pronto |
|---|---|
| T-1 | `POST /api/mobile/auth/google` valida o ID token de verdade e emite **o mesmo par de tokens** que `/api/mobile/login` |
| T-2 | **não vincular automaticamente** — 409 no app, `OAuthAccountNotLinked` na web, rota de vincular/desvincular e uma tela para isso |
| T-3 | o botão no app, com `@react-native-google-signin/google-signin` |
| T-4 | `POST /api/mobile/auth/apple` e o botão oficial da Apple |
| T-5 | a web já responde igual; falta **só** o `GOOGLE_CLIENT_SECRET` no Coolify |
| T-6 | a política de privacidade diz, nome por nome, o que vem de cada provedor |

**Três decisões que mudaram em relação ao plano, e por quê:**

**1. `jose` no lugar de `google-auth-library`.** A biblioteca do Google traz dez
pacotes para fazer uma coisa — conferir a assinatura de um JWT — e **não serve
para a Apple**, que precisaria de outra. O `jose` já vinha instalado (o
`next-auth` depende dele) e serve aos dois. Nada novo foi baixado: só declarei
no `package.json` o que já estava lá. Uma dependência a menos, não a mais.

**2. `allowDangerousEmailAccountLinking` continua `true` na web.** A spec pedia
`false` e **não dá** — o `PrismaAdapter` cria usuário com `{ name, image }`, e
este `User` tem `firstName`, `lastName` e `profileImageUrl`, todas obrigatórias.
Quem cria o usuário é o nosso `signIn`, e o adapter depois o acha pelo e-mail
para pendurar o `Account`; com `false`, **nenhum cadastro novo pelo Google
funciona**. A proteção que você queria está no `signIn`: conta que já existe e
não tem Google ligado é recusada antes, e aí a bandeira só chega a vincular ao
usuário que nasceu uma linha acima.

**3. O botão do Google não aparece no Android.** Não existe build Android nenhum
no EAS, logo não existe keystore, logo não existe SHA-1 para registrar o cliente
OAuth de lá — e sem ele o SDK responde `DEVELOPER_ERROR`, que na tela vira "não
foi possível entrar", sem mais nada. É uma linha e um build para ligar quando o
Android sair.

**E três defeitos que apareceram no caminho e foram corrigidos junto:**

- A tela de login da web **nunca leu o `?error=`**. `lib/auth-options.ts` já
  mandava `/login?error=AccessDenied` e `?error=AccountDeactivated`, e a pessoa
  voltava ao formulário vazio, sem uma frase, achando que tinha errado a senha.
- O Google entrava numa conta que já existia **só porque o e-mail batia** — que
  é justamente o que a sua regra 2 proíbe.
- `corsJson` não sabia mandar cabeçalho, então um 429 não conseguia dizer quando
  voltar.

## A contradição que precisa da sua palavra

A sua spec diz, na regra 2:

> Não achou e já existe User com o mesmo e-mail verificado → **não vincular
> automaticamente**. Pedir ao paciente que entre com a senha uma vez.

O código em produção diz o contrário:

```ts
GoogleProvider({
  // Allow linking Google to existing accounts (same email)
  allowDangerousEmailAccountLinking: true,
})
```

As duas posições são defensáveis. Vincular por e-mail verificado é cômodo e o
Google só devolve e-mail verificado; não vincular é mais seguro contra um e-mail
que já foi de outra pessoa, ou um endereço que a clínica digitou errado no
cadastro. **A sua spec pede o caminho mais seguro, e o código faz o outro.**

Eu seguiria a sua spec — **não vincular automaticamente** — e trocaria o
comportamento da web junto, para os dois lados responderem igual. Mas é decisão
sua, porque muda a experiência de quem já tem conta.

## Decisões que eu tomei

**O `sub`, nunca o e-mail.** Como a sua spec manda. O e-mail muda; o `sub` não.

**Pessoa gerida continua sem entrar.** `lib/auth-credentials.ts` recusa quem tem
`managedById`, e o login com Google tem de recusar igual — senão a porta nova
contorna a regra de que uma criança não tem credencial própria
([[personal-independente-da-clinica]] tem o mesmo espírito).

**O consentimento não é pulado.** Entrar com Google não aceita termos por
ninguém: quem nunca aceitou cai no mesmo portão de hoje.

**Nada de escopo além de `openid`, `email`, `profile`.** Qualquer coisa a mais
exige verificação do Google e reabre a tela de consentimento.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O backend valida o token do Google e emite a sessão BPR | — | **concluído** |
| T-2 | Quem já tem conta: **não vincular automaticamente** | T-1 | **concluído** |
| T-3 | O botão no app (dependência nativa → **build**) | T-1 | **concluído** (espera o build) |
| T-4 | Sign in with Apple — exigência da App Review, não opção | T-1 | **concluído** (espera a capability e o build) |
| T-5 | Ligar o Google na web, que já está escrito | — | **concluído** (espera o segredo no Coolify) |
| T-6 | A política de privacidade e a exclusão de conta | T-1 | **concluído** |

**Ordem:** T-1 e T-5 primeiro — são servidor, sobem sem build e dão para testar
na web no mesmo dia. T-3 e T-4 dependem de build e de coisas que só você faz.

## O que depende de você, e entra na [[094-o-que-depende-do-bruno]]

| # | o que falta | trava |
|---|---|---|
| G-1 | **Client ID Android** (package `com.bpr.clinic` + SHA-1) | login no Android |
| G-2 | **Client ID iOS** (bundle `com.bpr.clinic`) | login no iPhone |
| G-3 | **Os três SHA-1 do Android**: debug, upload key e **App signing key do Play** | sem o terceiro, funciona em teste e quebra na loja (`DEVELOPER_ERROR`, código 10) |
| G-4 | **Publicar a tela de consentimento** (sair de "Testing") | só usuários de teste conseguem entrar |
| G-5 | **Capability "Sign in with Apple"** no App ID | e ela **invalida o provisioning** — menu interativo, precisa de você ([[bug-capability-nova-invalida-provisioning]]) |
| G-6 | **Domínio para o relay da Apple** (`bpr.clinic` em *Sign in with Apple for Email Communication*) | e-mail da clínica não chega a quem esconder o endereço |
| G-7 | As variáveis no Coolify: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_IOS_CLIENT_ID` | nada funciona em produção |

**Boa notícia sobre uma pendência da sua spec:** *"package name e Bundle ID
definitivos"* **já estão decididos e publicados** — `com.bpr.clinic` nos dois,
e o app já está no TestFlight com ele. Esse item pode sair da lista.

## Suposições

- **O time da Apple é `97S4QQ26F9` (Kingdom US Limited)**, que é quem assina o
  app hoje. O Sign in with Apple nasce nesse time.
- **O Apple Pay não entra aqui.** É outra capability, e está parada na 094 B-5.
- **Rate limit** no endpoint novo: 10 por minuto por IP, como a sua spec pede.
- **Nenhum token em log.** Nem sucesso, nem erro, nem Sentry.

## O que esta atividade **não** faz

- Não toca em Gmail, Drive, Agenda ou qualquer dado do Google além de nome,
  e-mail e foto.
- Não remove o login por e-mail e senha.
- Não muda o onboarding clínico: quem entra pelo Google faz o mesmo aceite de
  termos e o mesmo consentimento de dados de saúde.
