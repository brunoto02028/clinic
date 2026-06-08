# T-2: Backend — auth mobile (extrair credenciais + endpoints JWT)

**Status:** concluído (QA `report-t-2.md` aprovado 9/9 + review aplicado)
**Depende de:** nenhuma

## Objetivo
Expor autenticação por token para clientes nativos: extrair a lógica de validação de
credenciais para um helper compartilhado e criar os endpoints
`/api/auth/mobile/login`, `/refresh` e `/logout` emitindo JWT (access) + refresh token.

## Contexto
Hoje a validação vive em `authorize()` do `CredentialsProvider` (`lib/auth-options.ts`):
bcrypt, lookup multi-tenant com `clinic`, `permissions`, audit logging. Mobile precisa de
bearer token, não cookie de sessão. O payload do JWT deve espelhar o token do web
(`id`, `role`, `firstName`, `lastName`, `clinicId`, `clinicName`, `clinicSlug`, `permissions`).

## Passos
1. Extrair a lógica de `authorize()` para `lib/auth-credentials.ts`
   (`validateCredentials(email, password)` → user + permissions, ou erro).
2. Refatorar `CredentialsProvider` em `lib/auth-options.ts` para usar o helper
   (sem mudança de comportamento no web).
3. Adicionar modelo `MobileRefreshToken` ao `prisma/schema.prisma` (id, userId, tokenHash,
   expiresAt, revokedAt, createdAt, device/userAgent opcional) + migração.
4. Criar `lib/mobile-tokens.ts`: assinar/verificar access JWT (`NEXTAUTH_SECRET`),
   gerar/rotacionar/revogar refresh token (hash no banco).
5. `POST /api/auth/mobile/login`: valida credenciais → retorna `{ accessToken, refreshToken, user }`.
6. `POST /api/auth/mobile/refresh`: valida refresh (rotativo) → novo par de tokens.
7. `POST /api/auth/mobile/logout`: revoga o refresh token.
8. Manter audit logging (`logAudit`/`sysLog`) nos fluxos de login.

## Arquivos afetados
- `lib/auth-credentials.ts` (novo)
- `lib/mobile-tokens.ts` (novo)
- `lib/auth-options.ts` (refatorar para usar o helper)
- `prisma/schema.prisma` + nova migração
- `app/api/auth/mobile/login/route.ts` (novo)
- `app/api/auth/mobile/refresh/route.ts` (novo)
- `app/api/auth/mobile/logout/route.ts` (novo)

## Critérios de aceite
- [ ] Login web (NextAuth) continua funcionando após a extração (sem regressão).
- [ ] `login` retorna access + refresh válidos para credenciais corretas.
- [ ] Credenciais inválidas retornam 401 sem vazar qual campo falhou.
- [ ] `refresh` emite novo par e invalida o refresh anterior (rotação).
- [ ] `logout` revoga o refresh (refresh subsequente falha).
- [ ] Access token expirado é rejeitado pelas rotas protegidas.
