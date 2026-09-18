# T-5: Aluno (web) — ver plano e registrar aderência

**Status:** concluído
**Depende de:** T-3

## Objetivo
O aluno vê seu plano alimentar ativo (metas + refeições) e marca refeições como cumpridas (nota/foto opcional) em `/dashboard/nutrition`; nova seção no portal.

## Contexto
Espelha o student-facing de workouts (`app/api/workouts/route.ts`, `app/api/workouts/[id]/logs/route.ts`, `assertStudentTrainingAccess`, ownership `studentId === actor.userId`). Seção do portal como a "workouts" personalOnly em `lib/patient-sections.ts`.

## Passos
1. `app/api/meal-plans/route.ts` → `GET` retorna o **plano ACTIVE** do próprio aluno (`assertStudentNutritionAccess`, `studentId = actor.userId`). Se houver mais de um ACTIVE (não deveria, T-3 garante), usa o mais recente.
2. `app/api/meal-plans/[id]/logs/route.ts`:
   - `POST` marca refeição feita (`MealLog` com mealId + `loggedDate` + snapshot `mealName`, note?, photoUrl?), **idempotente** via upsert em `@@unique([studentId, mealId, loggedDate])` (marcar 2x não duplica — G6). Valida ownership (plano é do aluno).
   - `DELETE` (?mealId=&date=) **desmarca** a refeição (G6).
   - `GET` lista logs do dia/período.
3. `app/dashboard/nutrition/page.tsx`:
   - **Empty-state** quando o aluno não tem plano ACTIVE ("Your trainer hasn't set a meal plan yet") (G5).
   - Mostra metas de macros, refeições do dia com **toggle "feito/desfazer"**, aderência da semana.
   - Guarda: se não for personal/nutrition-enabled, redirect para `/dashboard`.
4. `lib/patient-sections.ts` → seção `{ key:"nutrition", label:"Nutrition", labelPt:"Nutrição", icon:Apple, href:"/dashboard/nutrition", personalOnly:true, matchRoutes:["/dashboard/nutrition"] }`.
5. Confirmar consumo no sidebar (`components/dashboard/patient-sidebar.tsx`) — personalOnly já é filtrado; só validar ícone/label.

## Arquivos afetados
- `app/api/meal-plans/route.ts` (novo)
- `app/api/meal-plans/[id]/logs/route.ts` (novo)
- `app/dashboard/nutrition/page.tsx` (novo)
- `lib/patient-sections.ts`

## Critérios de aceite
- [ ] Aluno personal vê seu plano ACTIVE com metas e refeições; marca/desmarca refeição e a aderência atualiza (sem duplicar ao marcar 2x).
- [ ] Empty-state quando não há plano ACTIVE.
- [ ] Aluno não acessa/loga plano de outro aluno (404/negado).
- [ ] Seção "Nutrition" aparece no portal do aluno personal e não no do clínico.
- [ ] Paciente clínico que force `/dashboard/nutrition` é redirecionado.
