# Atividade 33 — Program Templates (biblioteca de treinos multi-semana + atribuição em massa)

**Status:** concluído

## Origem
Auditoria do produto real do Everfit (logado, não só marketing) em `docs/everfit-audit-2026-09-12.md`. Maior gap estrutural encontrado: nosso `WorkoutBuilder` (ativ.19/32) cria um treino avulso por aluno/dia. O Everfit tem **Program Templates**: um programa multi-semana reutilizável, montado uma vez e atribuído a N alunos de uma vez, com calendário de arrastar-e-soltar, "copiar dia", exercícios alternativos, e sincronização quando o treinador edita o template depois de já ter atribuído.

## Objetivo
Dar ao personal trainer uma biblioteca de **programas reutilizáveis** (multi-semana), em vez de montar o mesmo treino manualmente pra cada aluno. Reaproveitar ao máximo `Workout`/`WorkoutExercise`/`Exercise` já existentes — o programa é só um "molde" que, quando atribuído, gera os `Workout` de sempre.

## Decisões de design

1. **Novos models, não altera o fluxo atual**: `WorkoutTemplate` → `WorkoutTemplateDay` → `WorkoutTemplateExercise`, espelhando os campos de `Workout`/`WorkoutExercise`, mas sem `studentId` (pertence ao tenant/trainer, não a um aluno). `WorkoutTemplateDay` tem `weekIndex` (0-based) + `dayOfWeek` (0-6) + `name`/`phase`/`order` — permite conteúdo diferente em cada semana (progressão), que é o ponto central do gap.
2. **`Workout` ganha 2 campos novos, ambos opcionais** (não quebra nada existente): `scheduledDate DateTime?` (data concreta daquele treino, calculada a partir da data de início escolhida na atribuição) e `templateDayId String?` (rastreia de qual dia do template ele veio, `onDelete: SetNull`). Treinos criados manualmente hoje continuam com os dois `null` e se comportam exatamente como hoje (recorrência por `daysOfWeek`, sem data fixa).
3. **Atribuição em massa**: escolher 1 template + N alunos + **1 data de início única para todos nesta v1** (ver Suposições) → gera os `Workout`/`WorkoutExercise` concretos por aluno, com `scheduledDate` calculado dia a dia a partir do template.
4. **Sincronização é manual, não automática**: um botão "Enviar atualizações" no template, que sobrescreve os `Workout` vinculados (`templateDayId`) cuja `scheduledDate >= hoje` **e que ainda não têm nenhum `WorkoutLog`** (não mexe em treino já iniciado/concluído — nunca reescreve histórico).
5. **"Copiar dia"** em vez de drag&drop livre: um botão que duplica todos os exercícios de um dia do template para outro dia/semana. Resolve o caso de uso principal (repetir treino, variar semana a semana) sem precisar de uma lib de drag&drop nova.
6. **Visão do aluno**: hoje a API (`/api/mobile/workouts`, `WorkoutBuilder` no admin) retorna todos os `Workout` ativos sem filtro de data — o agrupamento por dia é feito no client via `daysOfWeek`. Vamos manter esse comportamento pros treinos recorrentes (`scheduledDate: null`) e **adicionar agrupamento por `scheduledDate`** (com destaque pro dia de hoje) só pros treinos vindos de um programa — sem regredir quem usa o fluxo manual de hoje.
7. **Gate**: mesmo padrão de `assertTrainingAccess`/`assertStudentTrainingAccess` já usado em toda a área de treino (ativ.19/32) — `personalOnly`, 404 pra CLINIC sem módulo TRAINING ou cross-tenant.
8. **Sem Stripe** — confirmado pelo Bruno, cobrança fica só na ativ.28.

## Suposições (validar antes de eu começar a implementar)

- **Data de início única por atribuição**: ao atribuir um template a vários alunos de uma vez, todos começam na mesma data. Se precisar de data por aluno, é uma tarefa extra (ficaria fácil de adicionar depois, o schema já suporta).
- **Sync sob demanda (botão), não automático a cada edição do template**: mais simples e mais seguro — evita sobrescrever silenciosamente um treino que o aluno já está no meio de fazer. O Everfit sincroniza instantaneamente a cada edição; a nossa v1 exige um clique explícito do treinador. Dá pra evoluir pra automático depois se fizer falta.
- **Sem drag&drop de mouse entre células do calendário** — "copiar dia" (botão) cobre o caso de uso principal. Se o Bruno considerar essencial ter arrastar-e-soltar de verdade, avisar antes — isso implicaria adicionar uma dependência nova (ex.: `@dnd-kit`), o que exige aviso prévio por instrução do projeto.
- **Duração máxima do programa**: vou limitar a 12 semanas na validação (evita templates absurdos por erro de digitação); ajustável se o Bruno quiser outro teto.
- **"Alternative exercises"** (feature do Everfit de sugerir substituto pro mesmo exercício) fica de fora desta atividade — é um recurso independente que pode virar gap próprio depois.

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Schema + API base do template (CRUD) | concluído |
| T-2 | Editor em calendário (grid semana×dia + copiar dia) | concluído |
| T-3 | Atribuição em massa (template → N alunos) | concluído |
| T-4 | Sincronização manual (push de atualizações) | concluído |
| T-5 | Visão do aluno agrupada por data (mobile + web) | concluído |
| T-6 | Gating + regressão | concluído |

## Referências
- `docs/everfit-audit-2026-09-12.md` (achados originais, prints em `docs/assets/everfit-audit-2026-09-12/`)
- `prisma/schema.prisma:2937` (`Workout`), `:2968` (`WorkoutExercise`)
- `app/api/admin/workouts/route.ts` (padrão de rota a replicar pro template)
- `lib/workout-access.ts` (`assertTrainingAccess`, `assertExercisesInTenant`)
- `specs/32-ai-workout-builder/` (atividade mais recente na mesma área, mesmo padrão de gating/QA)
