# QA Spec — Atividade 1: App nativo do paciente (Fundação)

Ferramentas: **API** via `curl` (endpoints mobile); **UI** via **Playwright** sobre o
**Expo Web**. Evidências em `qa/screenshots/` e outputs salvos no `report-t-N.md`.

> Auth presente nesta atividade → cenários sem token / token inválido incluídos.

---

## T-1 — Scaffold do app Expo

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 1.1 | UI | Subir Expo Web (`mobile:web`) e abrir a URL | App carrega a tela inicial sem erro no console |
| 1.2 | API | Inspecionar `app.json`/config | `scheme=bprrehab`, bundle id `com.bpr.rehab` presentes |
| 1.3 | UI | Verificar console do navegador | Sem erros/exceptions não tratados |

## T-2 — Backend auth mobile

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 2.1 | API | `POST /api/auth/mobile/login` com credenciais válidas de paciente | 200 + `{ accessToken, refreshToken, user }`; `user.role = PATIENT` |
| 2.2 | API | `POST /api/auth/mobile/login` com senha errada | 401, mensagem genérica (não revela campo) |
| 2.3 | API | `POST /api/auth/mobile/login` com e-mail inexistente | 401, mesma mensagem genérica |
| 2.4 | API | `POST /api/auth/mobile/login` sem body / campos faltando | 400 com erro de validação |
| 2.5 | API | `POST /api/auth/mobile/refresh` com refresh válido | 200 + novo par; refresh anterior fica inválido (rotação) |
| 2.6 | API | Reusar refresh já rotacionado | 401 (token revogado/rotacionado) |
| 2.7 | API | `POST /api/auth/mobile/logout` + tentar refresh | logout 200; refresh seguinte → 401 |
| 2.8 | API | Chamar rota protegida com access expirado/ inválido | 401 |
| 2.9 | API | Regressão: login web NextAuth (`/login`) | Continua funcionando (sem regressão na extração) |

## T-3 — Design system

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 3.1 | UI | Abrir `/_dev/ui` no Expo Web | Componentes (Button, Input, Card, Text, Spinner) renderizam |
| 3.2 | UI | Inspecionar cores/tipografia | Coerentes com a paleta do web |
| 3.3 | UI | Acionar `Button` em loading/disabled | Estado visual correto, sem clique duplo |

## T-4 — Client de API + auth

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 4.1 | UI | Após login, requisição autenticada | Header `Authorization: Bearer` presente (via network) |
| 4.2 | UI | Forçar 401 (token expirado) | Refresh transparente único + retry bem-sucedido |
| 4.3 | UI | Refresh inválido | Sessão limpa, redireciona ao login |
| 4.4 | UI | Restart do app com sessão válida (`bootstrap`) | Mantém logado, sem novo login |

## T-5 — Login + navegação + home

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 5.1 | UI | Login com credenciais válidas | Navega para a home |
| 5.2 | UI | Login com credenciais inválidas | Mensagem de erro clara; permanece no login |
| 5.3 | UI | Acessar rota protegida sem sessão | Redireciona para login |
| 5.4 | UI | Home autenticada | Exibe nome/clínica reais vindos da API |
| 5.5 | UI | Logout | Limpa sessão, volta ao login |
| 5.6 | UI | Reabrir app logado | Vai direto à home |
