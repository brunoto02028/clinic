# QA Report — T-2: Backend auth mobile (JWT + refresh)

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (9/9 cenários)
**Executado por:** QA via curl + tsx contra ambiente local isolado.

> Documento sujeito à revisão do advogado/responsável técnico.

## Ambiente de teste

- **PostgreSQL 16** local (Homebrew), banco `clinic_test` (isolado de produção).
- Schema aplicado com `prisma db push` (o projeto não usa migrações versionadas —
  ver nota abaixo). Tabela `mobile_refresh_tokens` confirmada via `\dt`.
- Seed: `scripts/seed-mobile-test.ts` → clinic "Bruno Physical Rehab" + paciente
  `sarah.thompson@example.com`.
- Next.js dev em `localhost:3000` com `DATABASE_URL` e `NEXTAUTH_SECRET` **inline**
  (não tocou o `.env` de produção).

### Nota de ajuste de plano
A spec previa "migração Prisma". O repositório **não possui `prisma/migrations/`** —
sincroniza schema via `db push`. Para não destoar do projeto, o model
`MobileRefreshToken` foi aplicado via `db push`. O schema versionado
(`prisma/schema.prisma`) contém o model; a aplicação em produção segue o mesmo
fluxo de `db push` já usado pela equipe.

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 2.1 | Login credenciais válidas | 200 + accessToken/refreshToken/user (role PATIENT) | 200, JWT com payload completo (id, role, clinicId, permissions), refresh opaco | ✅ |
| 2.2 | Login senha errada | 401 genérico | `{"error":"Invalid email or password"}` HTTP 401 | ✅ |
| 2.3 | Login e-mail inexistente | 401 genérico (mesma msg) | `{"error":"Invalid email or password"}` HTTP 401 | ✅ |
| 2.4 | Login sem campos | 400 validação | `{"error":"Email and password are required"}` HTTP 400 | ✅ |
| 2.5 | Refresh válido | 200 + novo par | HTTP 200, novo refresh emitido | ✅ |
| 2.6 | Reusar refresh rotacionado | 401 | `{"error":"Invalid or expired refresh token"}` HTTP 401 | ✅ |
| 2.7 | Logout + refresh subsequente | logout 200; refresh 401 | logout `{"success":true}` 200; refresh seguinte 401 | ✅ |
| 2.8 | Verify access token (válido/adulterado/lixo) | aceita válido, rejeita inválidos | sub correto; rejeitou adulterado e lixo | ✅ |
| 2.9 | Regressão: login web NextAuth | session-token criado | `✓ session-token presente` HTTP 200 | ✅ |

## Evidências (trechos)

**2.1 — login válido (JWT decodificado contém):**
```
sub, email, role=PATIENT, firstName, lastName,
clinicId, clinicName="Bruno Physical Rehab", clinicSlug, permissions{...}, iat, exp (+15min)
```

**2.6 — rotação de refresh:**
```
refresh inicial: 3e6c1ac8a46e7443...
refresh #1 → HTTP 200 (novo: 19e5fae9572ac2c7...)
reusar antigo → HTTP 401 "Invalid or expired refresh token"
```

**2.9 — regressão web:**
```
csrf obtido → POST /api/auth/callback/credentials → HTTP 200
✓ session-token presente (login web OK)
```

## Observações
- 2.8 executado como teste de unidade da lógica de assinatura/verificação (não há
  rota protegida consumidora ainda — isso chega nas tarefas T-4/T-5).
- Mensagens de erro de login não revelam qual campo falhou (2.2 = 2.3). Bom para
  segurança.
- Sem regressão no fluxo web após extrair a lógica para `lib/auth-credentials.ts`.

## Code review e correções aplicadas

Review independente realizado. Correções de maior valor aplicadas e re-testadas:

| Achado | Severidade | Ação |
|--------|------------|------|
| JWT verify sem allowlist de algoritmo | ALTA | ✅ Corrigido: `algorithm/algorithms: ["HS256"]` no sign/verify |
| Condição de corrida na rotação de refresh | MÉDIA | ✅ Corrigido: revogação atômica via `updateMany` condicional (count===1) |
| Sem detecção de reuso de token | MÉDIA | ✅ Adicionado: reapresentar refresh revogado revoga toda a família do usuário (`revokeAllForUser`) |
| `MobileRefreshToken` sem FK/cascade | ALTA | ✅ Corrigido: relação `user @relation(onDelete: Cascade)` nos dois lados |

**Re-teste pós-correção (evidência):**
```
login OK → refresh: 355a0735...
rotação #1 → HTTP 200 (novo: 2036561e...)
reuso do refresh antigo (revogado) → HTTP 401  [dispara reuse detection]
RT2 (família) após reuse detection → HTTP 401   [família revogada ✓]
verify token: válido aceito; lixo rejeitado (HS256 pinned)
```

### Dívidas técnicas registradas (não bloqueiam a fundação)
- **Rate limiting** em `/api/auth/mobile/login`: ausente. `trackFailedLogin` apenas
  loga (in-memory, não bloqueia). Implementar gating por IP antes de GA. (MÉDIA-2)
- **Enumeração de contas**: mensagens distintas para conta-Google / desativada são
  **herdadas do fluxo web** (compartilham `validateCredentials`). Mudar afetaria o web —
  decisão de produto, sinalizada ao responsável. (MÉDIA-3)
- **Purge de tokens expirados/revogados**: tabela cresce indefinidamente; adicionar
  cron de limpeza (índice em `expiresAt` já existe). (BAIXA-4)
- `verifyAccessToken` ainda não tem consumidor (esperado; entra nas T-4/T-5).
