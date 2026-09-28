# T-1: O backend valida o token do Google e emite a sessão BPR

**Status:** concluído (28/09/2026)
**Depende de:** nenhuma

## Objetivo

`POST /api/mobile/auth/google` recebe o ID token do Google, valida de verdade, e
devolve **o mesmo par de tokens** que o login por senha devolve.

## Contexto

O app nunca é fonte de identidade. Ele obtém o token do Google e manda para cá;
quem decide quem é a pessoa é o servidor.

Este sistema já tem a metade de baixo pronta: `signAccessToken`,
`issueRefreshToken` e `rotateRefreshToken` em `lib/mobile-tokens.ts`, e as rotas
`/api/mobile/login`, `/refresh` e `/logout`. A rota nova entra ao lado delas e
devolve a mesma coisa — se ela inventasse um formato próprio, o app teria dois
jeitos de estar logado.

E `AuthIdentity` não precisa nascer: o `Account` do NextAuth já é ela, com
`provider` + `providerAccountId` (o `sub`) e unicidade no par.

## Passos

1. `google-auth-library`, `OAuth2Client.verifyIdToken` — **dependência nova,
   avisar antes**.
2. Validar: assinatura (a biblioteca cuida e faz cache das chaves), `aud` na
   lista aceita (Web e iOS), `iss` de `accounts.google.com`, `exp`, o `nonce`
   que o app mandou, e `email_verified === true`.
3. Client IDs em variáveis de ambiente. Nunca no código, nunca no app.
4. Achou `Account` por (`google`, `sub`) → é login: emite os tokens e grava
   `lastLoginAt`.
5. **Pessoa gerida continua sem entrar.** Se o `User` tem `managedById`, recusa
   como `lib/auth-credentials.ts` recusa — a porta nova não pode contornar a
   regra de que uma criança não tem credencial própria.
6. **O consentimento não é pulado**: quem nunca aceitou os termos cai no mesmo
   portão de hoje, vindo do Google ou da senha.
7. Rate limit: 10 por minuto por IP.
8. Log de sucesso e de falha **sem o token**. Nem pedaço dele.

## Arquivos afetados

- `app/api/mobile/auth/google/route.ts` (novo)
- `lib/google-identity.ts` (novo — a validação, num lugar só)
- `lib/mobile-tokens.ts` (reuso, sem mudança esperada)

## Critérios de aceite

- [ ] Token válido de paciente existente → 200 com access + refresh
- [ ] Token adulterado, expirado, ou com `aud` de outro app → **401**
- [ ] `email_verified: false` → recusado
- [ ] `nonce` diferente do enviado → recusado
- [ ] Pessoa gerida → recusada, com a mesma frase do login por senha
- [ ] Nenhum token em log nenhum
- [ ] O par de tokens é indistinguível do que `/api/mobile/login` devolve
