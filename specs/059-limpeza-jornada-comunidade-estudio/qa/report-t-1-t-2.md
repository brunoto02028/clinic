# QA — Atividade 59, T-1 e T-2

**Escopo:** Comunidade fora do aluno de estúdio; Quizzes e Conquistas no menu do personal.

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`:
  - `components/dashboard/patient-sidebar.tsx`
  - `lib/personal-blocked-routes.ts`
  - `lib/admin-sections.ts`
  - `components/admin/section-tabs.tsx`
- **Ambiente:** Next dev :4002, fixtures locais, Playwright com contexto novo e cache desligado, curl e `fetch` logado.
- **Executado por:**
  - agente qa-tester;
  - sessão principal: matcher 20/20 e `visibleAdminSections`.
- **Veredito:** **T-1 APROVADA. T-2 APROVADA.**

## T-1 — Aluno
| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | `qa.aluno`: menu em 1366 e 390 px | UI | ✅ 13 itens, sem Community e sem Journey; Quizzes, Achievements e Challenges continuam |
| 1.2 | `qa.aluno`: `/dashboard/community` e APIs da Jornada | UI+API | ✅ Página → 307 `/dashboard`, também com query, barra no fim e clique. `/api/patient/journey`, `/journey/community`, `/journey/quiz` e `/journey/marketplace` → 404 |
| 1.3 | `qa.aluno`: `/dashboard/quizzes`, `/achievements`, `/challenges` | UI | ✅ 200, com conteúdo |
| 1.4 | `qa.pacientea` (clínica) com Community e Journey liberados | UI | ✅ "BPR Journey" e "Community" no menu; as páginas abrem e as APIs dão 200. Overrides restaurados |

## T-2 — Personal e abas
| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 2.1 | `qa.trainer`: abas da seção de alunos | UI | ✅ List, Tasks, **Quizzes**, **Achievements**; sem Journey |
| 2.2 | `qa.trainer`: navegação e destaque | UI | ✅ cada aba navega e fica ativa (`aria-selected`) |
| 2.3 | `qa.trainer`: `/admin/journey` e APIs | UI+API | ✅ página → 307 `/admin`. `/api/admin/journey*` → 404. `/api/admin/conditions`, `/quizzes` e `/achievements` → 200 |
| 2.4 | `qa.trainer`: `/admin/challenges` e `/admin/training-programs` | UI | ✅ abrem; `/api/admin/challenges` → 200 |
| 2.5 | `qa.admina` (clínica): abas de pacientes | UI | ✅ List, Screening, Tasks, Journey. Em `/admin/quizzes`, `/achievements` e `/conditions`, **Journey** fica destacada como antes. `/admin/journey` abre |
| 2.6 | `qa.admina`: seção Clinical | UI | ✅ **sem "Programs"**, que antes aparecia e redirecionava; `/admin/training-programs` continua redirecionando a clínica |
| 2.7 | `qa.superadmin` no estúdio e na plataforma | UI | ✅ no estúdio: abas do personal (Quizzes ativa em `/admin/quizzes`). Na plataforma: abas da clínica (Journey ativa). "Portal" por `superadminOnly` |

Screenshots em `qa/screenshots/`: `t-1-aluno-*`, `t-1-clinica-*`, `t-2-trainer-*`, `t-2-clinica-*`, `t-2-superadmin-*` (26 arquivos).

## Observações
- **O-1, corrigido depois do QA:** o personal abria `/admin/conditions` (biblioteca clínica de condições) pela URL, com a barra sem aba destacada. A página foi bloqueada para o personal. A API `/api/admin/conditions` continua, porque Quizzes e Achievements a usam. Matcher: página bloqueada, API livre.
- **O-2:** o superadmin vendo o estúdio ainda abre `/admin/journey` pela URL. O bloqueio é só do personal; na 57, o superadmin mantém o papel dele.
- **O-3:** o rótulo PT "Conquistas" não foi conferido na tela, porque os testes rodaram em EN.
- **Console:** só os 404 das chamadas propositais às APIs bloqueadas, o ruído de compilação do dev e os 403/401 antigos do superadmin na visão sem tenant.

## Limpeza
- `qa.pacientea.moduleOverrides` voltou a `NULL`, confirmado no banco.
- Superadmin sem seleção.
- Nenhum registro novo.
