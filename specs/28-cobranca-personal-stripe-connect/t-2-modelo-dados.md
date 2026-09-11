# T-2: Modelo de dados

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Models `BillingPlan` e `BillingSubscription` + enums, scoping tenant/trainer/student, com ids Stripe da conta conectada.

## Contexto
Scoping personal: clinicId + trainerId + studentId. `stripeProductId/stripePriceId` referem objetos criados NA conta conectada do personal (não na BPR).

## Passos
1. Enums `BillingInterval { ONE_TIME WEEKLY MONTHLY YEARLY }`, `BillingSubStatus { INCOMPLETE ACTIVE PAST_DUE CANCELLED PAID }`.
2. `Clinic`: adicionar `stripePayoutsEnabled Boolean @default(false)` e `stripeRequirementsDue Boolean @default(false)` (G4). `stripeAccountId`/`stripeOnboarded` já existem.
3. `BillingPlan` (clinicId, trainerId, name, description?, amountCents Int, currency default "GBP", interval, status default ACTIVE, stripeProductId?, stripePriceId?, timestamps).
4. `BillingSubscription` (clinicId, trainerId, studentId, billingPlanId, status, stripeCustomerId?, stripeSubscriptionId? @unique, stripeCheckoutSessionId?, currentPeriodEnd?, cancelAtPeriodEnd Boolean default false, cancelledAt?, timestamps).
5. `StudentStripeCustomer` (studentId, stripeAccountId, customerId, `@@unique([studentId, stripeAccountId])`) — G3 reuso de customer.
6. `ProcessedStripeEvent` (id String @id = stripe event.id, type, createdAt) — G2 idempotência de webhook.
7. Índices clinicId/trainerId/studentId/billingPlanId/status. Back-relations em Clinic e User (`TrainerBillingPlans`, `StudentBillingSubscriptions`, `TrainerBillingSubscriptions`, `StudentStripeCustomers`).
8. `npx prisma db push` (local) + `generate`.

## Arquivos afetados
- `prisma/schema.prisma`, `prisma/migrations`/db

## Critérios de aceite
- [ ] `prisma validate` passa; tabelas criadas; client expõe `billingPlan`/`billingSubscription`.
- [ ] Nenhuma alteração em models de pagamento clínicos (Payment/PatientSubscription/TreatmentPackage/MembershipPlan).
