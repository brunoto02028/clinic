# QA — Atividade 58 (Jornada escondida do aluno de estúdio)

Ambiente local :4002, fixtures (`qa.aluno`, `qa.pacientea`, `qa.trainer`, `qa.admina`), com contexto novo de Playwright a cada rodada.

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | UI | `qa.aluno`: menu em 1366 e 390 px | Sem "Journey"/"Jornada"; o resto igual (Quizzes, Achievements, Community…) |
| 1.2 | UI | `qa.aluno`: `/dashboard/journey`, `/dashboard/quiz` | Redirecionam para `/dashboard` |
| 1.3 | UI | `qa.aluno`: `/dashboard/quizzes`, `/dashboard/community`, `/dashboard/achievements` | Abrem (200, mesma URL). A Comunidade vazia não mostra "Start your journey" |
| 1.4 | API | `qa.aluno`: `GET /api/patient/journey/community` | 200 (não bloqueado) |
| 2.1 | UI | `qa.pacientea` (clínica) com `mod_journey` liberado: menu, `/dashboard/journey`, `/dashboard/quiz`, Comunidade vazia | Iguais a antes (item no menu, as páginas abrem, o botão aparece). Restaurar os overrides depois |
| 3.1 | UI | `qa.trainer`: `/admin/journey`, `/admin/quizzes`, `/admin/achievements` | Abrem |
