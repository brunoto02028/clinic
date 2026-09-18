# QA Report — T-5: Visão do aluno agrupada por data (mobile + web)

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado (todos os critérios de aceite confirmados com evidência real; mobile validado só por tipo/leitura de código — pendência conhecida de build EAS; 1 bug real de timezone encontrado por code review em paralelo e corrigido depois desta rodada)

**Ambiente:** `next dev` local em `http://localhost:4000`, banco local. API testada via script Node (login real NextAuth + `/api/mobile/login` Bearer). UI testada via Playwright MCP, login real pela UI.

**Fixtures:** `node scripts/qa/tenant-fixtures.cjs` — tenant B "QA Studio PT", alunos `alunoB`/`alunoB2`. `alunoB2` recebeu um `Workout` manual recorrente (regressão); `alunoB` recebeu um `WorkoutTemplate` atribuído (2 dias, um caindo hoje) + um `Workout` manual extra, pra testar coexistência.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `GET /api/mobile/workouts` / `/api/workouts` — aluno só recorrente, sem regressão de contrato | API | ✅ |
| 2 | Mesmo endpoint — aluno com programa, `scheduledDate`/`templateDayId` preenchidos | API | ✅ |
| 3 | UI web — "Program" (por data, hoje destacado) separado de "Recurring" | UI | ✅ |
| 4 | UI web — aluno só recorrente não vê rótulo de seção | UI | ✅ |
| 5 | Regressão — log de treino em "Recurring" | UI | ✅ |
| 6 | Regressão — log de treino em "Program" | UI | ✅ |
| extra | Mobile — typecheck limpo + leitura de código idêntica à web | tipo/leitura | ✅ |
| achado | `isToday`/`formatDate` usavam getters locais sobre um instante UTC → off-by-one em timezone negativo (Brasil) | código | ⚠️ corrigido, ver Addendum |

## Detalhes

### 1. `GET` sem regressão para aluno só com treino manual — ✅
`Workout` manual (`daysOfWeek:[1,3]`, sem `scheduledDate`) via API em ambos endpoints (web/mobile): resposta idêntica ao contrato anterior + `scheduledDate: null`, `templateDayId: null`. Nenhum campo removido.

### 2. `GET` inclui `scheduledDate`/`templateDayId` para aluno com programa — ✅
Template de 2 dias atribuído via `assign`; resposta trouxe `scheduledDate` correto por dia (`"2026-09-12T00:00:00.000Z"` pro dia de hoje, `"2026-09-14T00:00:00.000Z"` pro futuro) e `templateDayId` apontando pro dia de origem, em web e mobile.

### 3. UI web — "Program" separado de "Recurring", hoje destacado — ✅
Login como aluno com programa: seção "Program" com o dia de hoje primeiro (borda destacada) e o futuro depois, ordenados por data; seção "Recurring" com o treino manual sem data.
- **Evidência:** `screenshots/t-5-alunoB-lista-program-e-recurring.png`.

### 4. UI web — aluno só recorrente sem rótulo de seção — ✅
Lista mostra o treino direto, sem nenhum título "Program"/"Recurring" — confirma que o rótulo só aparece quando as duas seções coexistem, sem regressão visual.
- **Evidência:** `screenshots/t-5-alunoB2-lista-recorrente-sem-rotulo.png`.

### 5-6. Regressão — log de treino (recorrente e programa) — ✅
Fluxo completo de "Finish session" (marcar séries, RPE, salvar) funcionou idêntico nos dois tipos de treino; `WorkoutLog`/`SetLog` gravados corretamente em ambos, sem distinção no componente de log (como esperado).
- **Evidência:** `screenshots/t-5-alunoB2-log-recorrente-ok.png`, `screenshots/t-5-alunoB-log-program-ok.png`.

### Extra — Mobile: typecheck + leitura de código — ✅
`cd mobile && npx tsc --noEmit` sem erro em `training.ts`/`(treino)/index.tsx` (só o warning pré-existente de `baseUrl`). Leitura confirmou lógica idêntica à web. Execução em Expo real não feita — pendência conhecida (build EAS).

## Falhas e recomendações (da rodada original)

Nenhuma falha bloqueante encontrada nesta rodada — o bug de timezone (ver Addendum) foi achado em paralelo por code review, não por este QA, porque o ambiente de QA não reproduz o sintoma (mesmo padrão já visto nas T-3/T-4).

## Addendum — correção aplicada após esta rodada (2026-09-12, sessão principal)

Code review em paralelo encontrou um bug real: `isToday`/`formatDate`, duplicados em `components/workouts/student-workouts.tsx` e `mobile/app/(app)/(treino)/index.tsx`, liam `scheduledDate` (instante UTC-meia-noite, ver `assign/route.ts`) com getters **locais** (`getDate()`, `getMonth()`, `getFullYear()`). Para qualquer timezone negativo — Brasil é UTC-3 o ano todo — isso desalinha o dia em 1 (ex.: meia-noite UTC do dia 15 vira 21h do dia 14 no horário local), fazendo o treino de "hoje" não ser reconhecido como hoje e todas as datas exibidas aparecerem um dia antes.

**Verificação direta** (`$env:TZ = "America/Sao_Paulo"` via PowerShell, já que `TZ=x node` inline não é repassado ao processo no Git Bash/Windows):
```
local getDate (bug):    14 / 9   → isToday local (bug):  false
UTC getUTCDate (fixed): 15 / 9   → isToday UTC (fixed):  true
```
Confirma exatamente o sintoma descrito.

**Correção:** `isToday`/`formatDate` trocados pra usar `getUTCFullYear`/`getUTCMonth`/`getUTCDate`/`getUTCDay`, nos dois arquivos (web e mobile) — consistente com o mesmo padrão UTC já usado em `assign/route.ts`/`sync/route.ts` (T-3/T-4) e em `app/api/availability/route.ts`. Typecheck limpo em ambos os projetos (web e mobile) após a correção.

---

**Resultado:** ✅ Aprovado. 6/6 cenários formais + extras de mobile aprovados; bug de timezone encontrado por review e corrigido, verificado diretamente com timezone simulado.

## Limpeza
`node scripts/qa/tenant-cleanup.cjs` → `leftover fixtures: 0`.
