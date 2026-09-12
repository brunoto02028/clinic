# T-2: Editor em calendário (grid semana×dia + copiar dia)

**Status:** concluído
**Depende de:** T-1

## Objetivo
Tela de biblioteca de programas + editor visual em grid (semana × dia da semana), reaproveitando o formulário de exercício já existente no `WorkoutBuilder`.

## Contexto
Ver decisões 3 e 5 do plan.md. Sem drag&drop de mouse nesta v1 — "copiar dia" (botão) cobre repetir/variar treino entre dias/semanas.

## Passos
1. `app/admin/training-programs/page.tsx` (ou dentro da nav de Training já existente — decidir local exato olhando `lib/admin-sections.ts` no momento da implementação) — lista de templates (nome, semanas, nº de exercícios, ações: editar/duplicar/excluir).
2. `app/admin/training-programs/[id]/page.tsx` — editor:
   - Grid com abas/seletor de semana (1..N, igual ideia do "1/2/4 Week" do Everfit, mas nosso N vem do próprio template) × 7 colunas (dias da semana).
   - Cada célula = um `WorkoutTemplateDay` (pode estar vazia). Clicar abre o mesmo form de exercícios do `WorkoutBuilder` atual (reaproveitar componente, ver `components/workouts/workout-builder.tsx`), mas gravando em `WorkoutTemplateExercise` em vez de `WorkoutExercise`.
   - Botão "Copiar dia" em cada célula preenchida → escolher dia/semana destino → duplica os exercícios (novo `WorkoutTemplateDay` ou sobrescreve o destino, com confirmação se já tiver conteúdo).
   - Endpoint auxiliar: `POST /api/admin/workout-templates/[id]/days` (cria/atualiza um `WorkoutTemplateDay` com seus exercícios, mesmo shape de validação de `validateExercises`/`assertExercisesInTenant` já usado em `app/api/admin/workouts/route.ts`).
3. Duplicar template inteiro: `POST /api/admin/workout-templates/[id]/duplicate` — clona template + todos os days + exercises.

## Arquivos afetados
- `app/admin/training-programs/page.tsx` (novo)
- `app/admin/training-programs/[id]/page.tsx` (novo)
- `app/api/admin/workout-templates/[id]/days/route.ts` (novo)
- `app/api/admin/workout-templates/[id]/duplicate/route.ts` (novo)
- `lib/admin-sections.ts` (adicionar entrada de nav, `personalOnly: true`)

## Critérios de aceite
- [ ] Criar um template de 2+ semanas com dias diferentes por semana (progressão real, não repetição forçada).
- [ ] "Copiar dia" duplica exercícios corretamente entre dias/semanas.
- [ ] Duplicar template inteiro gera uma cópia independente (editar a cópia não afeta o original).
- [ ] Nav visível só pra personal trainer (`personalOnly`), reaproveitando o padrão de `visibleAdminSections`.
