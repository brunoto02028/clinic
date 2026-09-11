# T-4: UI admin de cobrança

**Status:** pendente
**Depende de:** T-3

## Objetivo
O personal cria/arquiva planos de cobrança e vê o status de pagamento/assinatura por aluno.

## Contexto
Reusa o padrão dos painéis (nutrition/workouts). Só aparece para personal onboardado; se não onboardado, mostra CTA "Connect payouts" (link do T-1).

## Passos
1. `components/billing/billing-panel.tsx`: se não onboardado → card "Connect Stripe para cobrar" (botão do T-1). Se onboardado → lista de planos (nome, valor, intervalo, status), form criar plano (nome, descrição, valor, intervalo one-time/weekly/monthly/yearly), arquivar; e uma lista de assinaturas dos alunos (aluno, plano, status, próxima cobrança).
2. Inserir na navegação do admin do personal — **decidir**: aba na ficha do aluno (cobrar um aluno específico) e/ou uma seção "Billing"/"Payments" top-level do personal. v1: aba "Billing" na ficha do aluno (criar/atribuir cobrança àquele aluno) + status. (Ver Suposição de UI.)
3. Botão "Charge student" gera o link de checkout (T-5) ou mostra o estado da assinatura.
4. Labels via relabel; inglês UK.

## Arquivos afetados
- `components/billing/billing-panel.tsx` (novo)
- ficha do aluno `app/admin/patients/[id]/page.tsx` (aba personal-only) e/ou nav

## Critérios de aceite (test mode)
- [ ] Não-onboardado vê CTA de conectar; onboardado vê planos + form.
- [ ] Criar/arquivar plano funciona; status por aluno visível.
- [ ] Tenant CLINIC não vê billing; sem regressão nas abas existentes.
