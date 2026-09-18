# QA — Atividade 59

Ambiente local :4002, fixtures (`qa.aluno`, `qa.trainer`, `qa.pacientea`, `qa.admina`, `qa.superadmin`), com contexto novo de Playwright a cada rodada.

## T-1 — Aluno
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | UI | `qa.aluno`: menu 1366/390 | Sem Community nem Journey; Quizzes, Achievements e Challenges continuam |
| 1.2 | UI+API | `qa.aluno`: `/dashboard/community`; `GET /api/patient/journey/community`, `/api/patient/journey/quiz`, `/api/patient/journey` | Página → `/dashboard`; APIs → 404 |
| 1.3 | UI | `qa.aluno`: `/dashboard/quizzes`, `/dashboard/achievements`, `/dashboard/challenges` | Abrem |
| 1.4 | UI | `qa.pacientea` com `mod_community` e `mod_journey` liberados | Community e Journey no menu e abrindo; restaurar os overrides depois |

## T-2 — Personal e abas
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | UI | `qa.trainer`: seção de alunos | Abas List, Tasks, **Quizzes**, **Achievements**; sem Journey |
| 2.2 | UI | `qa.trainer`: clicar em Quizzes e Achievements | As páginas abrem e a aba certa fica destacada |
| 2.3 | UI+API | `qa.trainer`: `/admin/journey`, `GET /api/admin/journey`, `/api/admin/journey/challenges` | Página → `/admin`; APIs → 404 |
| 2.4 | UI | `qa.trainer`: `/admin/challenges` (desafios do estúdio) e `/admin/training-programs` | Abrem, sem mudança |
| 2.5 | UI | `qa.admina` (clínica): seção de pacientes | Abas iguais a antes, incluindo "Journey"; sem Quizzes/Achievements personalOnly. Em `/admin/quizzes`, a aba Journey fica destacada como antes. `/admin/journey` abre |
| 2.6 | UI | `qa.admina`: seção Clinical | Sem a aba "Programs" (antes aparecia e redirecionava) |
| 2.7 | UI | `qa.superadmin` vendo `qa-studio-pt` | Abas do personal (Quizzes/Achievements); na visão da plataforma, as da clínica |
