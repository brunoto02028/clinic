# Atividade 27 — Nutrição / plano alimentar do personal trainer

## Objetivo
Dar ao personal trainer a camada de **nutrição** que hoje falta (gap identificado vs. Everfit): o personal cria **planos alimentares** com metas de macros (kcal, proteína, carbo, gordura) e refeições, atribui a um aluno; o aluno vê o plano e **registra aderência** (marca refeições como feitas, com nota/foto opcional) na web e no app; o personal acompanha a aderência vs. as metas. Tenant + aluno scoped, feature de personal (mesmo padrão de gating dos workouts). **Sem tocar no fluxo clínico.**

## Decisões de design
- **Arquitetura espelha Workouts/Assessments** (atividade 19/21): scoping `clinicId` + `studentId` + `trainerId` (relações `student`/`trainer` → `User`). NÃO usa `patientId`/`therapistId` (clínico).
- **Três camadas** (como Workout → WorkoutExercise → WorkoutLog):
  - `MealPlan` (pai): `clinicId`, `studentId`, `trainerId`, `name`, `status`, metas de macros, `notes`.
  - `Meal` (filho, cascade): refeição planejada (nome, horário sugerido, descrição do que comer, macros por refeição, ordem).
  - `MealLog` (log): registro de que uma refeição foi cumprida (própria coluna `clinicId`+`studentId` + índices, pois é consultado direto).
- **Superfície admin = aba por-aluno** na ficha do aluno (`/admin/patients/[id]`), como Workouts/Assessments — NÃO uma seção top-level do admin. Componente `MealPlanPanel` recebe `studentId`. (Evita mexer em `admin-sections.ts`.)
- **Portal do aluno**: nova seção `personalOnly` "Nutrition" em `/dashboard/nutrition` (`lib/patient-sections.ts` + sidebar).
- **Gating**: reutiliza o gate de TRAINING existente (`assertTrainingAccess` / `assertStudentTrainingAccess`, `isTrainingEnabled`) — nutrição vem junto do módulo de treino do personal. Wrappers finos em `lib/nutrition-access.ts` delegam para o de workout. (Ver Suposição 1.)
- **Sem banco de alimentos/receitas no v1**: refeições são texto livre + macros digitados manualmente pelo personal. Base de alimentos com busca fica para atividade futura.
- **Aderência v1**: aluno marca refeições planejadas como "feitas" por dia (+ nota/foto opcional), igual aos logs de série do workout. Marcar é **idempotente** (unique `studentId+mealId+loggedDate`) e reversível (desmarcar). Fórmula: `planned = refeições ativas × dias do período`, `pct = clamp(logged/planned)`, no fuso do tenant.
- **Editar plano preserva histórico**: o PUT faz **upsert das refeições por id** (não recria), e o `MealLog` guarda snapshot `mealName`+`loggedDate` com `Meal→MealLog onDelete: SetNull` — editar um plano em uso nunca apaga a aderência já registrada.
- **Feedback loop**: o personal VÊ os logs do aluno (refeições feitas, notas, fotos) no painel — não só um número. Ao atribuir/atualizar um plano, opção **"Notify student"** dispara a notificação existente (email/WhatsApp).
- **Um plano ACTIVE por aluno**: criar/ativar um plano pausa os demais ativos; o portal do aluno mostra o ACTIVE. Status geridos pelo personal (Activate/Pause/Archive/Complete).
- **Inglês UK base** + `relabel()` (personal já é o vocab-alvo; termos de nutrição são neutros).
- **Mobile por último**: T-6 entrega API + tela mobile, mas o build EAS entra no lote de release mobile pendente (com as telas da atividade 21). Web (T-1..T-5) é shippável sozinha.

## Modelo de dados (resumo)
```
MealPlan  { id, clinicId, studentId, trainerId, name, status(MealPlanStatus),
            targetKcal?, targetProteinG?, targetCarbsG?, targetFatG?, notes?, startDate, endDate?,
            meals Meal[], logs MealLog[] , timestamps }
Meal      { id, mealPlanId(cascade), name, timeOfDay?, description?, kcal?, proteinG?, carbsG?, fatG?, order }
MealLog   { id, clinicId, studentId, mealPlanId, mealId?, performedAt, note?, photoUrl?, timestamps }
enum MealPlanStatus { ACTIVE, PAUSED, COMPLETED, ARCHIVED }
```
Back-relations em `Clinic` e `User` (`StudentMealPlans`, `TrainerMealPlans`, `StudentMealLogs`).

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Modelo de dados | models MealPlan/Meal/MealLog + enum + back-relations + migração | concluído |
| T-2 | Lib nutrição | `lib/nutrition.ts` (validação + soma de macros + aderência) + `lib/nutrition-access.ts` (delegando ao gate de training) | concluído |
| T-3 | API admin | `/api/admin/meal-plans` (GET/POST) + `[id]` (GET/PUT/DELETE), tenant+aluno scoped, meals aninhados | concluído |
| T-4 | UI admin (ficha do aluno) | `components/nutrition/meal-plan-panel.tsx` + aba "Nutrition" personal-only na ficha | concluído |
| T-5 | Aluno (web) | `/api/meal-plans` (ler próprio) + `/api/meal-plans/[id]/logs` (registrar) + página `/dashboard/nutrition` + seção no portal | concluído |
| T-6 | Mobile | `NUTRICAO_DEF` em `mobile/modules` + `/api/mobile/meal-plans` + tela mobile (build EAS no lote de release) | pendente |
| T-7 | Gating + vocab + guardas | isPersonal em todas as superfícies, relabel, guarda de rota (clínica não acessa `/dashboard/nutrition`), regressão clínica intacta | pendente |

## Suposições (validar)
1. **Gate reutilizado**: nutrição usa o mesmo toggle de TRAINING do personal (não um módulo NUTRITION separado). Se você quiser que o personal possa ligar/desligar nutrição independente do treino, adiciono um `ClinicModuleAccess` key `NUTRITION` (migração + toggle nas settings) — diga.
2. **Sem base de alimentos no v1** (texto livre + macros manuais). Busca de alimentos/receitas = atividade futura.
3. **Aderência simples** (marcar refeição feita + nota/foto), sem contagem automática de calorias ingeridas nem scan de foto (o "MacroSnap" do Everfit é IA — futuro).
4. **Planos são por-aluno** (atribuídos), sem biblioteca de templates reutilizáveis no v1 (como os workouts). Templates = futuro.
5. **Fotos de refeição** reutilizam o padrão de upload R2 já usado (assessments/documents). Se preferir sem foto no v1, removo do escopo.
6. **Clínica**: a feature fica invisível/bloqueada para tenant CLINIC e para pacientes clínicos (personalOnly + guarda de rota).

## Backlog declarado (fora do v1, gaps conhecidos)
- **Foto de refeição pelo aluno**: a API e o feed do personal já suportam `photoUrl`; falta o upload R2 no fluxo do aluno (o v1 do aluno coleta só a **nota** opcional).
- **Aderência no fuso do tenant**: v1 usa data em UTC (marcar/desmarcar e aderência internamente consistentes); ajustar para o fuso do tenant depois (G7/B1).
- **Export/PDF** do plano alimentar (reusa infra de PDF da clínica).
- **Gráfico de tendência** de aderência (padrão `workout-progress`), hoje só número.
- **Expiração por `endDate`** (auto-complete/arquivar plano vencido).
- **Base de alimentos/receitas** com busca e **foto→macro por IA** (MacroSnap-like).
- **Templates** de plano reutilizáveis (não atribuídos).

## QA
`qa/qa-spec.md` — cenários por tarefa (API: happy path, entrada inválida, cross-tenant/cross-student negado; UI: criar plano, atribuir, aluno vê e registra, aderência). Inclui os cenários dos gaps endereçados: editar-preservando-logs, múltiplos planos (um ativo), desmarcar log/idempotência, empty-states, personal-vê-notas/fotos, notificação. Regressão: clínica e workouts intactos.
