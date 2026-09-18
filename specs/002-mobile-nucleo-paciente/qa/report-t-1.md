# QA Report — T-1: Auth dual (cookie OU bearer)

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (com correção de segurança aplicada e verificada)
**Ferramenta:** curl contra Next local (`localhost:3000`, DB de teste).

> Documento sujeito à revisão do responsável técnico/segurança.

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 1.1 | `GET /api/appointments` com bearer | 200 + dados do paciente | `{"appointments":[]}` 200 | ✅ |
| 1.2 | `GET /api/appointments` com cookie (web) | 200 (sem regressão) | 200 | ✅ |
| 1.3 | Sem auth | negado | 307 → /login (gate do middleware) | ✅* |
| 1.4 | Bearer inválido | 401 | `{"error":"Unauthorised"}` 401 | ✅ |
| 1.5 | Escopo (só os próprios dados) | identidade do token, não de header | profile retorna o user do bearer, não o `x-user-id` forjado | ✅ |
| — | `exercises` / `profile` com bearer | 200 | 200 (profile com dados reais — `getEffectiveUser` dual) | ✅ |

\* 1.3: requisição sem nenhuma credencial é redirecionada (307) pelo middleware, não 401.
O acesso é negado de qualquer forma; o app sempre envia bearer.

## Arquitetura
- `lib/dual-auth.ts`: `getRequestSession(request)` — sessão NextAuth OU bearer →
  objeto session-like. Usado em `appointments` (GET), `appointments/[id]` (GET),
  `exercises` (GET).
- `lib/get-effective-user.ts`: agora aceita bearer via header (cobre `/api/patient/*`,
  incl. `profile`, sem editar cada rota).
- `middleware.ts`: passthrough de bearer para rotas mobile (verificação fica na rota,
  pois o Edge runtime não roda `jsonwebtoken`).
- Mutações (POST/PATCH/PUT) seguem cookie-only — mobile recebe 401 (esperado nesta fase).

## ⚠️ Code review: vulnerabilidade encontrada e corrigida

O review de segurança identificou um **bypass de autorização ALTO** na primeira versão
do passthrough do middleware (deixava passar **qualquer** `/api` com header Bearer, sem
remover headers de identidade que o cliente pode forjar):

| Achado | Sev. | Correção |
|--------|------|----------|
| Spoofing de `x-user-role`/`x-clinic-id` → acesso a rotas admin header-trusting (vazamento multi-tenant de PII clínica) | **ALTA** | ✅ Passthrough restrito a allowlist (`/api/appointments`, `/api/exercises`, `/api/patient`) **+ stripping** de `x-user-id/role`, `x-clinic-id`, `x-impersonated-by` |
| Passthrough não validava o token (qualquer `Bearer ...` pulava o gate) | **ALTA** | ✅ Mitigado pela allowlist; rotas mobile validam o bearer; admin volta ao gate de cookie |
| Default silencioso de role `"PATIENT"` em `getEffectiveUser` | MÉDIA | ✅ Agora nega (`return null`) se role ausente |

**Verificação por teste de ataque (pós-correção):**
```
/api/admin/clinical-notes + Bearer + x-user-role:ADMIN forjado → 307 NEGADO ✅
/api/patient/profile + x-user-id de outro forjado → retorna o user do bearer (Sarah), não o forjado ✅
rotas mobile (appointments/exercises/profile) com bearer → 200 ✅
cookie web → 200 (sem regressão) ✅
```

### Dívidas registradas
- Role vem do JWT (TTL 15min, não revogável): rotas sensíveis devem reconfirmar no DB.
  **Não usar `getRequestSession`/`getEffectiveUser` em `/api/admin/*`.**
- Rotas mobile devem derivar `clinicId` do JWT/DB, nunca do header `x-clinic-id`.
