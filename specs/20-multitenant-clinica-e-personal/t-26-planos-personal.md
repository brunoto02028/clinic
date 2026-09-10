# T-26: Planos e mensalidade do personal

**Status:** pendente
**Trilha:** PERSONAL
**Depende de:** T-16, T-19

## Objetivo
O personal vende planos (mensal, pacote de sessões) e recebe na própria conta.

## Passos
1. Reusar `MembershipPlan` e `ServicePackage` do tenant: o personal cria e edita os planos.
2. O aluno assina pelo checkout com Connect (T-16); o plano libera módulos e créditos de sessão ou aula.

## Critérios de aceite
- [ ] Cenários da T-26 passando (Stripe em modo teste).
