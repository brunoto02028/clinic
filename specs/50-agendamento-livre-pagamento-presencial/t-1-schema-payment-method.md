# T-1: Schema — `PaymentMethod` + `Appointment.paymentMethod`

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Dar ao `Appointment` um jeito explícito e rastreável de registrar "o paciente vai pagar
online" vs "o paciente vai pagar presencialmente" — hoje isso não existe como dado, é só
ausência de cobrança.

## Contexto
Ver decisão D1 em `plan.md`. Default `ONLINE` garante que toda consulta já existente (e toda
consulta criada por staff sem mandar o campo) continua se comportando exatamente como hoje.

## Passos
1. Em `prisma/schema.prisma`, adicionar o enum:
   ```prisma
   enum PaymentMethod {
     ONLINE
     IN_PERSON
   }
   ```
   (perto dos outros enums de `Appointment`, ex.: junto de `AppointmentMode`, linha ~227).
2. No `model Appointment` (linha ~1003), adicionar o campo logo abaixo de `mode`:
   ```prisma
   paymentMethod PaymentMethod @default(ONLINE)
   ```
3. ~~Rodar `npx prisma migrate dev`~~ — **correção durante a implementação**: este projeto
   nunca usou `prisma migrate` de fato (não existe `prisma/migrations/`, `migrate status`
   confirma "current database is not managed by Prisma Migrate", `migrate dev` pediria reset
   total do banco local por falta de baseline). O schema sempre foi sincronizado via
   `npx prisma db push` — Dockerfile só roda `prisma generate`, nunca `migrate deploy`. Rodar
   `npx prisma db push` localmente (não-destrutivo, só adiciona a coluna/enum novos).
4. Aplicar `npx prisma db push` também contra a `DATABASE_URL` de produção, do mesmo jeito que
   qualquer mudança de schema anterior deste projeto (fora do deploy de código via Coolify).

## Arquivos afetados
- `prisma/schema.prisma`
- `prisma/migrations/<timestamp>_add_appointment_payment_method/migration.sql` (gerado)

## Critérios de aceite
- [ ] `npx prisma validate` passa.
- [ ] Migration aplicada localmente sem erro; `Appointment` existentes ficam com
      `paymentMethod = ONLINE` automaticamente (default do banco).
- [ ] `npx tsc --noEmit` sem novos erros.
