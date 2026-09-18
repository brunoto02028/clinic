# T-1: Campo `instagramImportEnabled` no schema + migração de boot

**Status:** concluído (implementado; QA formal + review rodam junto com T-1–T-4 no final)
**Depende de:** nenhuma

## Objetivo
Adicionar o campo booleano por clínica e garantir que clínicas `type: CLINIC` existentes não percam acesso ao recurso que já usam hoje.

## Contexto
Ver decisões de design no `plan.md`. Padrão idêntico ao de `Clinic.stripePayoutsEnabled`. `Clinic.primaryColor`/`secondaryColor` e sua migração (`scripts/migrate-personal-trainer-colors.js`, chamada em `start.sh`) são o precedente direto pra esse tipo de "migração de boot idempotente".

## Passos
1. `prisma/schema.prisma`: adicionar `instagramImportEnabled Boolean @default(false)` no model `Clinic`, perto dos outros flags de feature.
2. Criar `scripts/backfill-instagram-import-flag.js` (idempotente, mesmo padrão de `migrate-personal-trainer-colors.js`): `UPDATE`/`updateMany` ligando `instagramImportEnabled = true` só pra clínicas `type: 'CLINIC'` que ainda estejam com `false` (não mexe em `PERSONAL_TRAINER`).
3. Adicionar a chamada desse script em `start.sh`, depois do `db push` e dos outros scripts de boot já existentes.
4. Rodar localmente (`npx prisma@6.7.0 db push` + o script) pra confirmar que a clínica QA (`type: CLINIC`) fica com `true` e a `qa-studio-pt` (`type: PERSONAL_TRAINER`) fica com `false`.

## Arquivos afetados
- `prisma/schema.prisma`
- `scripts/backfill-instagram-import-flag.js` (novo)
- `start.sh`

## Critérios de aceite
- [ ] `npx prisma@6.7.0 db push` roda sem erro localmente.
- [ ] Após rodar o script de backfill, clínica de tipo `CLINIC` fica com `instagramImportEnabled = true`.
- [ ] Clínica de tipo `PERSONAL_TRAINER` fica com `instagramImportEnabled = false`.
- [ ] Rodar o script duas vezes seguidas não muda nada na segunda vez (idempotência).
