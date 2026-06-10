# QA Spec — Atividade 2: Núcleo do paciente (Fase 1)

Ferramentas: **API** via `curl` (auth dual); **UI** via **Playwright** sobre **Expo Web**.
Evidências em `qa/screenshots/` e outputs nos `report-t-N.md`.

> Auth presente → cenários sem token / token inválido incluídos.
> Seed estendido com agendamentos/exercícios de exemplo para o paciente de teste.

---

## T-1 — Auth dual

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 1.1 | API | `GET /api/appointments` com bearer válido | 200 + agendamentos do paciente |
| 1.2 | API | `GET /api/appointments` com cookie de sessão (web) | 200 (sem regressão) |
| 1.3 | API | `GET /api/appointments` sem auth | 401 |
| 1.4 | API | `GET /api/appointments` com bearer inválido | 401 |
| 1.5 | API | Paciente A tenta `GET /api/appointments/[id]` de paciente B | 403/404 (escopo) |

## T-2 — Navegação por abas

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 2.1 | UI | Login → app | Tab bar com 4 abas visível |
| 2.2 | UI | Tocar cada aba | Navega para Home/Agendamentos/Exercícios/Perfil |
| 2.3 | UI | Console | Sem erros |

## T-3 — Home

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 3.1 | UI | Abrir Home autenticado | Saudação com nome real |
| 3.2 | UI | Próximo agendamento | Card com dados reais ou estado vazio |
| 3.3 | UI | Tocar atalho | Navega à aba correspondente |

## T-4 — Agendamentos

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 4.1 | UI | Abrir aba Agendamentos | Lista com agendamentos reais |
| 4.2 | UI | Tocar um item | Abre detalhe correto |
| 4.3 | UI | Paciente sem agendamentos | Estado vazio coerente |

## T-5 — Exercícios

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 5.1 | UI | Abrir aba Exercícios | Lista de exercícios prescritos |
| 5.2 | UI | Tocar um item | Detalhe com instruções |
| 5.3 | UI | Sem exercícios | Estado vazio coerente |

## T-6 — Perfil

| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 6.1 | UI | Abrir aba Perfil | Dados reais (nome, e-mail, telefone, clínica) |
| 6.2 | UI | Editar nome/telefone e salvar | Sucesso; persiste após reload |
| 6.3 | UI | Validação (campo inválido) | Erro exibido, não salva |
| 6.4 | UI | Logout pelo perfil | Volta ao login |
