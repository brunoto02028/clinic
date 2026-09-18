# Atividade 2 — App nativo do paciente: Núcleo (Fase 1)

**Status geral:** concluído (T-1 a T-6 com QA aprovado + review)
**Criada em:** 07/06/2026
**Depende de:** Atividade 1 (Fundação) — concluída

> Documento sujeito à revisão do responsável técnico.

## Objetivo

Entregar o núcleo funcional do app do paciente sobre a fundação da Atividade 1:
navegação por abas e as telas **Home (dashboard)**, **Agendamentos**, **Exercícios
prescritos** e **Perfil**, consumindo as APIs Next.js existentes via autenticação dual
(cookie de sessão OU bearer mobile).

## Contexto e decisões (validadas no brainstorming)

| Tema | Decisão |
|------|---------|
| Auth nas APIs | **Dual**: helper que aceita sessão NextAuth (web) OU bearer JWT mobile, aplicado às rotas do paciente desta fase. Reusa as APIs existentes. |
| Telas | Home enriquecida, Agendamentos, Exercícios prescritos, Perfil |
| Navegação | Abas (Expo Router Tabs) dentro do grupo protegido `(app)` |
| Dados | TanStack Query + `apiFetch` (fundação da Atividade 1) |

### APIs existentes a reusar (confirmadas)
- Agendamentos: `GET /api/appointments`, `GET /api/appointments/[id]`
- Exercícios: `GET /api/exercises`
- Perfil: rota a confirmar na T-1 (candidatas em `/api/patient/*` ou `/api/users`)
- Todas autenticam hoje via `getServerSession` (31 rotas no domínio paciente).

## Tarefas

| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | Auth dual no backend (helper + aplicar nas rotas da fase) | concluído | — |
| T-2 | Navegação por abas + esqueleto das telas | concluído | — |
| T-3 | Home (dashboard): próximo agendamento + resumo | concluído | T-1, T-2 |
| T-4 | Agendamentos: lista + detalhe | concluído | T-1, T-2 |
| T-5 | Exercícios prescritos: lista + detalhe | concluído | T-1, T-2 |
| T-6 | Perfil: ver + editar dados básicos | concluído | T-1, T-2 |

## Suposições (validar)

1. **Auth dual não-invasiva**: o helper `requireUser(request)` tenta `getServerSession`
   e, se ausente, valida o bearer via `getMobileUser`. Aplicado **apenas** às rotas que
   as telas desta fase consomem (não às 307 de uma vez). Web permanece intacto.
2. **Edição de perfil** limitada a campos básicos (nome, telefone) nesta fase; sem upload
   de foto/avançado.
3. **Detalhe de agendamento** é leitura nesta fase; **reagendar/cancelar** fica para fase
   posterior (já existe `/api/appointments/[id]/reschedule`).
4. As APIs existentes retornam dados suficientes para as telas; ajustes de payload, se
   necessários, serão aditivos (não quebram o web).
5. QA segue via Expo Web + Playwright contra Next + Postgres locais; o seed de teste será
   estendido (`scripts/seed-mobile-test.ts`) com agendamentos/exercícios de exemplo.

## Critério de pronto da atividade

- [ ] Abas navegáveis com as 4 telas.
- [ ] Cada tela exibe dados reais do paciente autenticado via bearer.
- [ ] Web (cookie) continua funcionando nas mesmas rotas (sem regressão).
- [ ] Edição de perfil persiste.
- [ ] Todas as tarefas com `qa/report-t-N.md` aprovado e review feito.
