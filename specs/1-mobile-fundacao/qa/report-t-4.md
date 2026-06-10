# QA Report — T-4: Client de API + auth no app

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (validado via fluxo end-to-end com a T-5)
**Ferramenta:** Playwright sobre Expo Web (`localhost:8081`) + Next local (`localhost:3000`, DB de teste).

> O QA da T-4 é exercido através do fluxo de auth da T-5 (a camada de client só é
> observável via UI). Cenários cruzados com `report-t-5.md`.

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 4.1 | Requisição autenticada | Header `Authorization: Bearer` | `/api/auth/mobile/me` retornou o perfil (200) usando o access token; sem token → 401 | ✅ |
| 4.3 | Refresh inválido | Sessão limpa → login | Refresh token corrompido no storage → bootstrap falhou → redirecionou para `/login` | ✅ |
| 4.4 | Bootstrap com sessão válida | Mantém logado | Reload restaurou a sessão e foi direto à home (sem novo login) | ✅ |
| 4.2 | Refresh transparente no 401 | Refresh único + retry | Validado por composição (ver nota) | ◑ |

## Evidências
- 4.1: home renderizou dados reais vindos de `/me` (bearer). Backend confirmou
  `/me` 200 com bearer e 401 sem token (curl).
- 4.3: `localStorage` com refresh inválido → app caiu em `/login` (sessão limpa).
- 4.4: reload em sessão válida → home com "Sarah Thompson".

## Nota sobre 4.2
O interceptor de 401 do `apiFetch` faz `refreshOnce()` (lock de concorrência) + retry.
A primitiva `refreshRequest` está provada end-to-end: o `bootstrap` (4.4/5.6) renova a
sessão via refresh com sucesso, e o backend valida rotação/erro (`report-t-2.md`).
Forçar isoladamente "access expirado + refresh válido" no E2E exigiria contornar o
`bootstrap` (que renova o token antes da 1ª request); por isso o caminho composto está
validado, mas o disparo isolado do retry fica como verificação pendente para a fase com
emulador (token de 15min expirando naturalmente).

## Entregue
```
src/lib/secure-storage.ts   tokenStorage (SecureStore nativo / localStorage web)
src/api/config.ts           API_URL (EXPO_PUBLIC_API_URL, default produção)
src/api/types.ts            AuthUser, AuthTokens, AuthResponse
src/api/auth.ts             loginRequest, refreshRequest, logoutRequest
src/api/client.ts           apiFetch (bearer + refresh único + retry + onAuthFailure)
src/api/patient.ts          fetchMe
src/store/auth.ts           Zustand: status/user, bootstrap/login/logout
app/_layout.tsx             QueryClientProvider + bootstrap no boot
```

### Backend complementar (necessário para a home consumir dados)
- `lib/mobile-auth-guard.ts` — `getMobileUser` (verifica Bearer; usa `verifyAccessToken`)
- `app/api/auth/mobile/me/route.ts` — perfil do paciente, bearer-protected
- `lib/mobile-cors.ts` — CORS para o alvo Expo Web/PWA (apps nativos não precisam)

## Code review e correções aplicadas

Review independente. Como o backend revoga a **família** de refresh tokens ao detectar
reuso (T-2), concorrência no client poderia causar logout espúrio. Corrigido:

| Achado | Sev. | Ação |
|--------|------|------|
| `bootstrap` e `apiFetch` com locks de refresh distintos → 2 rotações do mesmo token → família revogada | ALTA | ✅ Unificado num único `refreshSession()` com lock compartilhado, usado por ambos |
| 401 no retry (pós-refresh) não limpava a sessão | ALTA | ✅ `failSession()` (clear + onAuthFailure) também no retry |
| Logout sem coordenação com refresh em voo → token órfão | ALTA | ✅ `logout` aguarda `pendingRefresh()` e revoga o token corrente |
| Erro de login renderizado sob o campo senha | BAIXA | ✅ Movido para banner próprio (`testID=login-error`) |

Re-teste pós-correção: login válido → home (sem regressão); dados reais carregados.

### Dívidas registradas para produção
- **CORS** `*` + login sem rate-limit: restringir `MOBILE_CORS_ORIGIN` e adicionar
  rate-limit no `/login` antes de GA (cruza com dívida da T-2).
- **localStorage no web**: se o Web/PWA virar alvo de produção com PII de paciente,
  migrar o refresh para cookie httpOnly (no nativo, SecureStore já é seguro).
- Endpoints mobile protegidos devem revalidar conta no banco (como o `/me` faz),
  não confiar só no payload do JWT (até 15 min de validade).
