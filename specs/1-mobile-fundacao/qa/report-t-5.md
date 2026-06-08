# QA Report — T-5: Login + navegação protegida + home

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (6/6 cenários)
**Ferramenta:** Playwright sobre Expo Web (`localhost:8081`) + Next local (`localhost:3000`, DB de teste).

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 5.1 | Login válido | Navega para a home | `sarah.thompson@example.com` / senha correta → `/home` | ✅ |
| 5.2 | Login inválido | Mensagem de erro clara | "Invalid email or password" exibida; permanece no login | ✅ |
| 5.3 | Rota protegida sem sessão | Redireciona p/ login | Boot sem token → `/login` (gate em `app/index.tsx`) | ✅ |
| 5.4 | Home autenticada | Dados reais do paciente | "Sarah Thompson" + "Bruno Physical Rehab" + email (via `/me`) | ✅ |
| 5.5 | Logout | Limpa sessão, volta ao login | Botão "Log out" → `/login` | ✅ |
| 5.6 | Reabrir app logado | Vai direto à home | Reload restaurou sessão → `/home` sem novo login | ✅ |

## Evidências
- Screenshot home autenticada: `qa/screenshots/t5-home-autenticada.png`
- 5.2: mensagem "Invalid email or password" no campo; único erro de console é o 401
  esperado da rede (`/api/auth/mobile/login` 401).
- 5.3: ao abrir `/`, gate redirecionou a `/login` (sem sessão).
- 5.6: reload em `/` → `wait_for("Sarah Thompson")` resolveu em `/home`.

## Entregue
```
app/index.tsx              gate: loading → spinner; auth → /home; senão → /login
app/login.tsx              formulário e-mail/senha, erro, loading, redirect
app/(app)/_layout.tsx      guarda do grupo protegido (redireciona se não autenticado)
app/(app)/home.tsx         useQuery(fetchMe) → nome/clínica/email + logout
```

## Notas
- Login por e-mail/senha apenas (Google OAuth fora desta fase — Suposição #1). ✅
- Home consome `/api/auth/mobile/me` (bearer) em vez de `/api/patient` (cookie/NextAuth),
  pois as APIs existentes autenticam por sessão web. Ajuste da Suposição #6 — documentado.
- Dupla proteção: gate em `index.tsx` + guarda no `(app)/_layout.tsx`.
