# T-3: Admin + gating

**Status:** concluído
**Depende de:** T-1

## Objetivo
O personal vê as badges de um aluno na ficha; feature 100% personal-only; sem regressão.

## Passos
1. `app/api/admin/badges/route.ts` (GET `?studentId=`) → `assertTrainingAccess` + `assertPatientAccess(actor, studentId)` (aluno do tenant, senão 404); `computeSignals(studentId, clinicId)` → `earnedBadges`; retorna.
2. UI admin: strip read-only de badges no topo do `MealPlanPanel`? Não — no painel de **Challenges do aluno**. Como Challenges hoje é seção top-level (studio-wide), o "por aluno" no admin fica na **ficha do aluno**: adicionar um pequeno bloco "Achievements" no topo de um painel personal existente da ficha (ex.: dentro de `components/nutrition/meal-plan-panel.tsx`? não). Decisão: novo componente `components/challenges/student-badges-strip.tsx` (prop studentId) exibido numa aba/bloco personal-only da ficha — reusar a aba "Workouts" ou "Assessments" topo. **Escolha v1:** renderizar o strip no topo do `AssessmentPanel`? Evitar acoplar. → Criar bloco no topo da aba **Workouts** (WorkoutProgress) OU um mini-card. Ver Suposição 2 do plan; implementação: incluir `<StudentBadgesStrip studentId>` no topo do `TabsContent value="workouts"` (personal-only, já gated).
3. Gating: rota admin gated; strip só aparece para personal (já dentro de `{isPersonal && ...}`).
4. Regressão: nada clínico tocado; badges não persistem nada.

## Arquivos afetados
- `app/api/admin/badges/route.ts` (novo)
- `components/challenges/student-badges-strip.tsx` (novo)
- `app/admin/patients/[id]/page.tsx` (inserir o strip no TabsContent workouts, personal-only)

## Critérios de aceite
- [ ] Admin vê as badges do aluno (ganhas/não) na ficha; só para personal.
- [ ] `?studentId=` de outro tenant → 404; sem TRAINING → negado.
- [ ] Tenant CLINIC: nenhum strip/rota de badges; sem regressão.
