# T-16: Stripe Connect

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-12

## Objetivo
O pagamento de cada tenant cai na conta Stripe **do tenant** (achado A5). O tenant padrão (BPR) continua na conta da plataforma.

## Passos
1. Onboarding do tenant:
   - conta Express e Account Link, a partir das configurações do admin do tenant;
   - webhook `account.updated` atualiza `stripeOnboarded`.
2. `lib/stripe-tenant.ts` monta os parâmetros do checkout:
   - `transfer_data.destination` e `application_fee_amount` (taxa configurável, padrão 0) quando o tenant não é o padrão;
   - bloqueia a cobrança se o tenant não concluiu o onboarding.
3. Aplicar nas 10 rotas de checkout: `payments/create-checkout`, `shop`, `orders/[id]/payment`, `patient/membership/subscribe`, `patient/packages`, `patient/treatment-plans`, `patient/marketplace`, `admin/patients/[id]/packages`, `admin/appointments`, `appointments/[id]/reschedule`.
4. Confirmar antes que a chave Stripe local é de teste. Se não for, parar e perguntar.

## Critérios de aceite
- [ ] Cenários da T-16 passando em modo teste.
- [ ] Regressão: o checkout da BPR fica igual.
