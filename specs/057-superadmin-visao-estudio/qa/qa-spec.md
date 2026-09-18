# QA — Atividade 57 (superadmin vê o estúdio como o personal)

Ambiente local, dev em :4002, com as fixtures de `scripts/qa/tenant-fixtures.cjs`: `qa.superadmin`, `qa.trainer` (qa-studio-pt), `qa.aluno`, `qa.admina` e `qa.pacientea` (qa-clinic-a). Usar um contexto novo de Playwright a cada rodada.

## T-1 — Sessão
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | API | superadmin sem seleção → `GET /api/auth/session` | Campos do próprio tenant, iguais a hoje |
| 1.2 | API+UI | superadmin seleciona `qa-studio-pt` (seletor ou "Manage this Clinic") → sessão e `/admin` | `clinicType: PERSONAL_TRAINER`, `clinicName: "QA Studio PT"`. Painel com "Studio", halteres, "Trainers", menu de personal (Training, Students), título "QA Studio PT · Admin" |
| 1.3 | UI | Ainda no estúdio: `/admin/training-programs`, `/admin/nutrition`, `/admin/challenges` | Abrem (antes redirecionavam) |
| 1.4 | API+UI | superadmin seleciona `qa-clinic-a` | Visão de clínica com o nome "QA Clinic A" |
| 1.5 | API | Cookie `selected-clinic-id` com um id inexistente | Sessão com o próprio tenant, sem erro |
| 1.6 | API | `qa.trainer`, `qa.aluno`, `qa.admina`, `qa.pacientea` → `/api/auth/session` | Iguais a antes da mudança (comparar os campos) |

## T-2 — Faixa
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | UI | superadmin no estúdio | Faixa "Viewing QA Studio PT as platform admin · Back to BPR" (PT: "Você está vendo… · Voltar para a BPR") |
| 2.2 | UI | Clicar em "Back to BPR" | Seleção limpa, `/admin` com a visão da BPR, sem faixa |
| 2.3 | UI | `qa.trainer` e `qa.admina` no `/admin` | Sem faixa |
| 2.4 | UI | 390 px | Sem rolagem horizontal |

## T-3 — Regressão
| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | UI | superadmin no estúdio → ficha do `qa.aluno` → "View as Student" | Portal do aluno de estúdio: menu de aluno (Workouts, Sessions…), título "QA Studio PT" |
| 3.2 | UI | Personal, aluno, admin e paciente navegam 3 telas cada | Menus e títulos iguais aos de antes |
| 3.3 | UI | superadmin volta para a BPR | Tudo como era |
