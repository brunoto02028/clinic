# QA — Atividade 58, T-1 (Jornada escondida do aluno de estúdio)

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`:
  - `components/dashboard/patient-sidebar.tsx`
  - `lib/personal-blocked-routes.ts`
  - `app/dashboard/community/page.tsx`
- **Ambiente:** Next dev :4002, fixtures locais, Playwright com contexto novo e cache desligado.
- **Executado por:** agente qa-tester, mais a sessão principal (teste unitário do matcher: 9/9).
- **Veredito:** **APROVADO**.

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | `qa.aluno`: menu em 1366 e 390 px | UI | ✅ 14 itens, sem Journey/Jornada; o resto igual |
| 1.2 | `qa.aluno`: `/dashboard/journey` e `/dashboard/quiz` | UI+API | ✅ 307 → `/dashboard`. Também redirecionam as subrotas, as query strings e a barra no fim |
| 1.3 | `qa.aluno`: `/quizzes`, `/community`, `/achievements` | UI | ✅ 200 na mesma URL. A Comunidade vazia não mostra o botão da jornada |
| 1.4 | `qa.aluno`: `GET /api/patient/journey/community` | API | ✅ 200 (não bloqueado) |
| 2.1 | `qa.pacientea` (clínica) com Journey e Community liberados | UI | ✅ "BPR Journey" no menu; `/dashboard/journey`, `/dashboard/quiz` e `/quizzes` abrem; o botão "Start your journey" aparece |
| 3.1 | `qa.trainer`: `/admin/journey`, `/admin/quizzes`, `/admin/achievements` | UI | ✅ abrem |
| M | Matcher (`isPersonalBlockedRoute`) | lib | ✅ journey e quiz bloqueados; `/quizzes`, `/community`, `/achievements` e `/api/patient/journey[/community]` livres |

Screenshots em `qa/screenshots/`:
- `t-1-aluno-*.png`
- `t-1-clinica-*.png`
- `t-1-trainer-*.png`

## Observações
- **O-1 (preexistente, clínica):** na primeira visita, a `/api/patient/journey` pode dar 500 (`P2002` no `PatientProgress`) por causa de duas chamadas simultâneas. A segunda devolve 200.
- **O-2:** a API da Jornada continua aberta por chamada direta, como planejado. O marketplace filtra por tenant.
- **O-3 (preexistente, lado do personal, para a próxima):**
  - em `/admin/journey`, no tema escuro, o título e os números dos cards quase não aparecem;
  - as abas "Marketplace" e "AI Coach" aparecem para o personal, mas as APIs delas são bloqueadas para estúdio.

## Limpeza
- Os overrides do `qa.pacientea` voltaram a `NULL` (confirmado no banco).
- Ficaram 1 `PatientProgress` e 1 `DailyMission` do `qa.pacientea`, criados pela visita normal à página.
