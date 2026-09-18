# T-4: UI admin — aba Nutrition na ficha do aluno

**Status:** concluído
**Depende de:** T-3

## Objetivo
Painel de nutrição na ficha do aluno: criar/editar plano alimentar (metas de macros + refeições), listar planos existentes, ver aderência. Aba "Nutrition" só para personal.

## Contexto
Espelha `components/assessments/assessment-panel.tsx` e `components/workouts/workout-builder.tsx` (prop `studentId`, fetch próprio). Inserção na ficha igual às abas Workouts/Assessments em `app/admin/patients/[id]/page.tsx` (wrappers `{isPersonal && ...}`).

## Passos
1. `components/nutrition/meal-plan-panel.tsx` (prop `studentId`):
   - **Empty-state** quando o aluno não tem plano ("No meal plan yet — create one to get started") (G5).
   - Lista planos (`GET /api/admin/meal-plans?studentId=`), badge de status, aderência resumida.
   - **Controle de status (G5):** botões Activate / Pause / Archive por plano.
   - **Feed de aderência (G2):** exibir os logs do aluno — refeições marcadas como feitas, com data, nota e foto (thumbnail) — não só um número. É o núcleo do acompanhamento.
   - Form criar/editar: nome, metas (kcal/protein/carbs/fat), lista de refeições (nome, horário, descrição, macros), botão adicionar/remover refeição; total de macros planejado vs metas.
   - **Checkbox "Notify student"** ao salvar (G3) → envia `notifyStudent` na request.
   - Salvar (POST/PUT), excluir (DELETE) com confirmação.
2. Em `app/admin/patients/[id]/page.tsx`:
   - import `MealPlanPanel`.
   - `{isPersonal && <TabsTrigger value="nutrition"><Apple/>Nutrition</TabsTrigger>}` perto das outras abas personal.
   - `{isPersonal && <TabsContent value="nutrition"><MealPlanPanel studentId={patientId} /></TabsContent>}`.
3. Labels via `relabel()`; UI inglês UK.

## Arquivos afetados
- `components/nutrition/meal-plan-panel.tsx` (novo)
- `app/admin/patients/[id]/page.tsx`

## Critérios de aceite
- [ ] Aba "Nutrition" aparece só para personal, some para clínica.
- [ ] Empty-state quando aluno sem plano; criar/editar/excluir funcionam.
- [ ] Activate/Pause/Archive mudam o status; ativar um pausa os outros.
- [ ] O personal vê o feed de aderência do aluno (refeições feitas, notas, fotos).
- [ ] Checkbox "Notify student" dispara notificação.
- [ ] Total de macros planejado é exibido vs metas.
- [ ] Nenhum vocab clínico; sem regressão nas abas Workouts/Assessments.
