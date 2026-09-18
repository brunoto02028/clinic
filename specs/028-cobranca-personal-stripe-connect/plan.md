# Atividade 28 — Cobrança recorrente do aluno via Stripe Connect

## Objetivo
Permitir que o personal trainer **cobre os próprios alunos dentro do sistema**, com o dinheiro indo para a **conta Stripe do próprio personal** (não a da BPR). O personal conecta/onboarda sua conta (Stripe Connect), cria **planos de cobrança** (assinatura semanal/mensal/anual ou pacote avulso), o aluno paga pelo portal, e o personal acompanha o status de pagamento/assinatura. A BPR pode reter uma **taxa de plataforma** opcional. Tenant+aluno scoped, feature de personal (gated). **Sem tocar no fluxo clínico de pagamentos** (a espinha BPR de Payment/PatientSubscription/TreatmentPackage fica intacta).

## Situação atual (do scan da infra)
- **Uma única conta Stripe da BPR** (`STRIPE_SECRET_KEY`); **Stripe Connect NÃO implementado** — `Clinic.stripeAccountId`/`stripeOnboarded` existem mas nunca são escritos.
- Existe espinha de assinatura (`MembershipPlan` → checkout `mode:subscription` → `PatientSubscription` → webhook `customer.subscription.*`), mas deposita tudo na conta BPR — **não reutilizável para dinheiro do personal**.
- Webhook único em `app/api/webhooks/stripe/route.ts`; refunds em `app/api/admin/cancellations`.
- `lib/stripe.ts` = singleton; `lib/stripe-marketplace.ts` cria product+price (sem `stripeAccount`).

## Decisões de design
- **Connect Express**: onboarding hospedado pela Stripe (KYC/compliance/payouts pela Stripe). O personal cai num fluxo Stripe e volta onboardado. Guardar `Clinic.stripeAccountId` + estado rico (não só um boolean — ver abaixo).
- **Direct charges na conta conectada** (personal = merchant of record): products/prices/checkout/refunds criados **na conta do personal** via o header `stripeAccount: <acctId>`. Sem `transfer_data`/`on_behalf_of` (isso é destination charge — não usar).
- **G1 — Ponto único de acesso à Stripe no billing**: `lib/connect.ts` expõe `stripeFor(clinicId)` que embute `{ stripeAccount }` resolvido do tenant. TODO call de billing usa isso. **Proibido** no fluxo de billing importar `lib/stripe-marketplace.ts` ou o singleton `stripe` nu (senão o produto/charge nasce na conta BPR — dinheiro no lugar errado).
- **G11 — Invariante de segurança**: o `stripeAccount` é SEMPRE resolvido no servidor a partir do tenant do ator (admin) ou do tenant do plano (checkout do aluno) — **nunca** de input do cliente.
- **G4 — Estado de onboarding rico**: gate de "pode cobrar" = `charges_enabled`. Guardar/surfacear também `payouts_enabled` e "action needed" quando `requirements.currently_due` não-vazio ou `disabled_reason`. Um único boolean escondia "cobra mas não recebe".
- **Taxa de plataforma opcional**: `application_fee_amount` (payment) / `application_fee_percent` (subscription), aplicada **só se fee > 0**. **Default v1 = 0%**. (Ver Suposição 2.)
- **Modelos dedicados** `BillingPlan` + `BillingSubscription` (NÃO reusar `MembershipPlan`/módulos). + `StudentStripeCustomer` (G3, reuso de customer) e `ProcessedStripeEvent` (G2, idempotência).
- **G3 — Reuso de customer por conta conectada**: em direct charge o Customer vive na conta do personal. Reusar o mesmo customer do aluno entre cobranças (persistir `(studentId, stripeAccountId) → customerId`), senão cada checkout cria customer novo.
- **Tipos de plano**: recorrente (weekly/monthly/yearly) e avulso (one-time). Scoping clinicId+trainerId+studentId (como MealPlan/workout).
- **G6 — Um recorrente ACTIVE por aluno**: o checkout de assinatura recusa se já existe `BillingSubscription` ACTIVE do aluno; troca de plano = cancelar a atual antes de assinar outra.
- **Gate duplo**: feature personal (gate TRAINING) **E** `charges_enabled` (só então cria plano/cobra).
- **Webhooks de Connect**: handler separado com `STRIPE_CONNECT_WEBHOOK_SECRET` próprio; casa `event.account` → tenant por `stripeAccountId`. **G2 — idempotência** por `event.id` (tabela `ProcessedStripeEvent`, no-op em duplicado) e **ACK (200)** para evento de conta não mapeada / irrelevante (400 só para assinatura inválida — evitar retry storm da Stripe). Trata `account.updated`, `checkout.session.completed`, `checkout.session.expired` (G5), `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`.
- **G7 — Cancel/refund**: cancelar no **fim do período** por padrão (opção imediato); refund **total** pelo staff do **próprio** tenant personal; a BPR não estorna cobranças de personal por padrão. Sempre com `stripeAccount`.
- **Test mode**: todo o QA em Stripe **test mode** com contas conectadas de teste (Stripe fornece onboarding de teste). Nunca chaves live no QA.
- **Mobile**: fora do v1 (o aluno paga pelo portal web; checkout hospedado abre no navegador). Cobrança no app entra depois.

## Modelo de dados (resumo)
```
Clinic.stripeAccountId (JÁ EXISTE) + stripeOnboarded (JÁ EXISTE, = charges_enabled)
  + novos flags: stripePayoutsEnabled Boolean, stripeRequirementsDue Boolean (G4)
BillingPlan { id, clinicId, trainerId, name, description?, amountCents, currency(GBP),
              interval(ONE_TIME|WEEKLY|MONTHLY|YEARLY), status(ACTIVE|ARCHIVED),
              stripeProductId?, stripePriceId?,  // criados NA conta conectada
              createdAt, updatedAt }
BillingSubscription { id, clinicId, trainerId, studentId, billingPlanId,
                      status(INCOMPLETE|ACTIVE|PAST_DUE|CANCELLED|PAID),  // PAID p/ one-time
                      stripeCustomerId?, stripeSubscriptionId? @unique, stripeCheckoutSessionId?,
                      currentPeriodEnd?, cancelAtPeriodEnd, cancelledAt?, timestamps }
  // G5: no máximo 1 INCOMPLETE por (studentId, billingPlanId) — upsert reusa a linha
StudentStripeCustomer { id, studentId, stripeAccountId, customerId, @@unique([studentId, stripeAccountId]) } // G3
ProcessedStripeEvent { id(=stripe event.id), type, createdAt } // G2 idempotência
enum BillingInterval { ONE_TIME WEEKLY MONTHLY YEARLY }
enum BillingSubStatus { INCOMPLETE ACTIVE PAST_DUE CANCELLED PAID }
```
Índices por clinicId/trainerId/studentId/billingPlanId/status; back-relations em Clinic/User.

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Connect onboarding | API criar Express account + account link; `account.updated` → grava `stripeAccountId`/`stripeOnboarded`; UI "Connect payouts" no admin do personal; status/refresh | código pronto (aguarda QA test-mode) |
| T-2 | Modelo de dados | `BillingPlan` + `BillingSubscription` + enums + back-relations + `db push` | concluído |
| T-3 | Lib + API planos | `lib/billing.ts` (validação, fee) + `lib/connect.ts` (helpers `stripeAccount`) + `/api/admin/billing-plans` (CRUD; cria product/price na conta conectada) | código pronto (aguarda QA test-mode) |
| T-4 | UI admin | `components/billing/billing-panel.tsx` — criar/arquivar planos, ver status de pagamento por aluno; aba "Billing" na ficha | código pronto (aguarda QA test-mode) |
| T-5 | Checkout do aluno | `/api/billing/checkout` + `/api/billing/plans` + UI portal + seção "Payments" | código pronto (aguarda QA test-mode) |
| T-6 | Webhooks Connect | `/api/webhooks/stripe-connect` (idempotente, ACK) + cancel/refund | código pronto (aguarda QA test-mode) |
| T-7 | Gating + vocab + guardas + regressão | gating/visibilidade **✅ QA aprovado**; regressão Stripe/fluxo onboardado aguarda QA test-mode | gating verificado (QA Stripe pendente) |

## Suposições (validar)
1. **Connect Express** (não Standard/Custom) — onboarding e KYC pela Stripe. OK?
2. **Taxa de plataforma da BPR = 0% no v1** (BPR não retém nada da cobrança do personal). Se você quiser cobrar uma % dos personais, defina o valor e eu ligo o `application_fee`.
3. **Direct charges** (personal é o merchant of record; recibo/estorno na conta dele). Alternativa seria destination charges (BPR como merchant) — mais acoplado à BPR; não recomendado aqui.
4. **Sem gate de feature por pagamento**: o billing é para o personal cobrar coaching em geral; não trava nutrição/treino atrás de pagamento (isso seria uma feature futura). O plano de cobrança é só um preço que o aluno paga.
5. **Aluno paga pelo portal web** (checkout hospedado Stripe). App entra depois.
6. **1 assinatura recorrente ativa por aluno** por padrão (one-time avulsos permitidos além disso); trocar de plano = cancelar a atual antes.
7. **Moeda GBP** travada no v1 + **valor mínimo** (~£0.30, piso da Stripe) validados no `validateBillingPlan`. Multi-moeda = futuro.
8. Precisa de **`STRIPE_CONNECT_WEBHOOK_SECRET`** novo no Coolify e **Connect habilitado no dashboard Stripe** (test e live separados). QA sempre com **chave de test**; QA online só depois de você validar em test. Eu aviso quando configurar.
9. **Trainer desconecta / conta restrita (G10)**: v1 — assinaturas ativas seguem na Stripe; a UI sinaliza a conta com problema ("payouts pending"/"action needed"); não migramos assinaturas automaticamente.

## Comportamentos aceitos no v1 (do code review)
- **Editar preço não migra assinantes atuais** (M2): trocar o preço cria um novo price; assinaturas Stripe já ativas seguem no preço antigo (comportamento da Stripe). O novo preço vale para **novos** assinantes. A UI deve deixar isso claro; alternativa futura = bloquear edição de preço quando há assinantes.
- **One-time pode ser pago de novo** (comprar outra vez) — intencional no v1.
- **Objetos Stripe órfãos em falha de DB** (M1): product/price/customer são criados na Stripe antes do write no DB; se o DB falhar, ficam órfãos na conta do personal (o customer se auto-cura no reuso; product/price não). Aceito no v1; limpeza best-effort é melhoria futura.
- **Corrida de idempotência do webhook** (M3): dedupe grava `event.id` após sucesso; reentregas concorrentes podem reprocessar, mas os handlers são idempotentes (updateMany/upsert) → inócuo.

## Riscos / notas
- Connect é dinheiro real + KYC: todo QA em **test mode**; QA online só depois de você validar em test.
- Requer configurar no dashboard Stripe: habilitar Connect (Express), branding da plataforma, e o webhook endpoint de Connect. Passo manual seu (eu documento).
- Provavelmente a maior atividade até aqui — dá pra fatiar entrega: T-1..T-3 (onboarding + criar planos) primeiro, T-5/T-6 (aluno paga + webhooks) depois.

## QA
`qa/qa-spec.md` — cenários por tarefa em **Stripe test mode**: onboarding cria conta e grava flags; criar plano cria product/price na conta conectada; checkout gera session na conta certa; webhook atualiza status; refund; gating (clínica sem billing, não-onboardado não cobra); isolamento tenant/aluno. Regressão: Stripe BPR (memberships/packages/appointments) intacto.
