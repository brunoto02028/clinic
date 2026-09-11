# T-7: Gating + vocab + guardas + regressão

**Status:** pendente
**Depende de:** T-4, T-5, T-6

## Objetivo
Cobrança 100% personal-only e só para tenant onboardado; clínica e o Stripe da BPR intactos; sem vazamento.

## Passos
1. Toda superfície (aba/UI admin, endpoints, portal) checa personal + (para criar/cobrar) `stripeOnboarded`.
2. Guarda de rota nas páginas/portais de billing (não-personal → redirect); rotas de API com gate.
3. Refund/cancelamento e planos nunca tocam a conta BPR (sempre `stripeAccount`).
4. Vocab por relabel; inglês UK; nada clínico.
5. Regressão: memberships/packages/appointments/marketplace da BPR (conta única) continuam funcionando; webhook BPR intacto.

## Critérios de aceite
- [ ] Tenant CLINIC: nenhuma superfície de billing personal acessível.
- [ ] Tenant PERSONAL não-onboardado: vê só o CTA de conectar, não consegue cobrar.
- [ ] PERSONAL onboardado: fluxo completo funciona.
- [ ] Stripe BPR (fluxos clínicos) sem regressão.
