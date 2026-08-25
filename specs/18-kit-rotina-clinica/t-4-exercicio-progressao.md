# T-4: Progressão/regressão no Exercise + seed

**Status:** pendente
**Depende de:** T-1

## Objetivo
Permitir encadear exercícios por dificuldade (progressão/regressão) e semear um conjunto original cobrindo os 3 protocolos-piloto.

## Contexto
`Exercise`/`ExerciseFolder` já existem. Falta a relação de progressão. Conteúdo autoral.

## Passos
1. Adicionar relação `progressionOfId`/`regressionOfId` (ou `level` + grupo) ao `Exercise` (migração aditiva).
2. Seed idempotente de exercícios originais (nome, descrição, dose, cuidados) EN/PT, ligados por progressão.
3. Conferir no `admin/exercises`.

## Arquivos afetados
- migração aditiva no `Exercise`
- `scripts/seed-exercises-*.ts`

## Critérios de aceite
- [ ] Exercícios encadeáveis por nível.
- [ ] Seed idempotente, bilíngue, autoral.
