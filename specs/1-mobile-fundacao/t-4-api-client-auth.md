# T-4: Client de API + auth no app (secure-store, refresh, TanStack Query)

**Status:** concluído (QA `report-t-4.md` aprovado + review aplicado)
**Depende de:** T-1, T-2

## Objetivo
Implementar no app a camada de acesso à API com autenticação por token: armazenamento
seguro dos tokens, injeção de `Authorization: Bearer`, refresh automático no expirar e
provider do TanStack Query.

## Contexto
Backend já expõe `/api/auth/mobile/*` (T-2). O app deve guardar tokens em
`expo-secure-store`, anexar o access token nas requisições, e ao receber 401 tentar o
refresh transparente (uma vez) antes de deslogar. Base URL via env
(`EXPO_PUBLIC_API_URL`), default produção.

## Passos
1. `mobile/src/lib/secure-storage.ts`: wrapper de `expo-secure-store` (get/set/clear tokens).
2. `mobile/src/api/client.ts`: fetch/axios wrapper com base URL, header de auth e
   interceptor de 401 → refresh único → retry; falha → limpa sessão.
3. `mobile/src/store/auth.ts` (Zustand): estado de sessão (`user`, `status`),
   ações `login`, `logout`, `bootstrap` (lê token no boot).
4. `mobile/src/api/auth.ts`: funções `loginRequest`, `refreshRequest`, `logoutRequest`.
5. Provider do **TanStack Query** no layout raiz do app.
6. Tratar concorrência de refresh (uma única chamada de refresh em voo).

## Arquivos afetados
- `mobile/src/lib/secure-storage.ts` (novo)
- `mobile/src/api/client.ts` (novo)
- `mobile/src/api/auth.ts` (novo)
- `mobile/src/store/auth.ts` (novo)
- `mobile/app/_layout.tsx` (provider TanStack Query)

## Critérios de aceite
- [ ] Tokens persistem em secure-store e sobrevivem ao restart do app.
- [ ] Requisições autenticadas enviam o bearer token.
- [ ] 401 dispara refresh único e retry transparente.
- [ ] Refresh inválido limpa a sessão e leva ao login.
- [ ] `bootstrap` no boot restaura sessão válida sem novo login.
