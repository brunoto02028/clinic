# QA Report — T-7: Gating + visibilidade + guardas (UI, sem Stripe)

**Data:** 2026-09-11 · `next dev` local, `bpr_clinic_local`, en-GB. Escopo: só visibilidade/gating/guardas — fluxos que chamam a Stripe (onboarding/criar plano/checkout/webhook) **não** testados (sem chave), ficam para o QA test-mode. Fixtures 2 tenants, removidas ao final.

**Resultado: ✅ APROVADO (5/5 obrigatórios + 1 opcional; 0 erros de console).**

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Admin personal: aba "Billing" na ficha + card "Connect Stripe" (não-conectado) | ✅ |
| 2 | Admin CLINIC: ficha do paciente SEM aba "Billing" (nem "Nutrition") | ✅ |
| 3 | Aluno personal: sidebar "Payments" + `/dashboard/billing` empty-state | ✅ |
| 4 | Paciente CLINIC: sem "Payments"; `/dashboard/billing` → redirect `/dashboard` | ✅ |
| 5 | Console sem erros/warnings React | ✅ |
| 6 | GET /api/admin/connect/status: personal 200 `{connected:false}` / CLINIC 404 | ✅ |

Empty-state do aluno: "Your trainer hasn't set up any payment plans yet." A guarda `app/dashboard/billing/page.tsx` redireciona só quando `clinicType` é conhecido e não-personal (token antigo cai no fallback — intencional).

## Code review (fork) — 2 HIGH corrigidos
- **H1** webhook `stripe-connect` retornava 200 em erro de processamento → sub presa em INCOMPLETE sem retry. **Corrigido:** retorna 500 (event.id só grava após sucesso + handlers idempotentes = retry seguro).
- **H2** refund de assinatura lia `session.payment_intent` (null em modo subscription). **Corrigido:** resolve via `subscription.latest_invoice.payment_intent`; caminho da session só para one-time.
- Aceitos no v1 (declarados no plan): M1 (órfãos Stripe em falha de DB), M2 (editar preço não migra assinantes), M3 (corrida de idempotência inócua), one-time pode repagar.
- Sólido confirmado: todo call Stripe com `{stripeAccount}`; G11 (conta do servidor); isolamento de tenant no webhook; sem uso de stripe-marketplace/singleton nu → dinheiro nunca cai na conta BPR.

## Pendente (fora de escopo — QA Stripe test-mode)
Connect onboarding, criar plano (product/price na conta conectada), checkout do aluno, webhooks, refund/cancel, e as guardas 409 (`assertChargesEnabled`). Requer chave `sk_test` + Connect (Express) habilitado no dashboard + `STRIPE_CONNECT_WEBHOOK_SECRET`.

**Screenshots:** `specs/28-cobranca-personal-stripe-connect/qa/screenshots/`.
