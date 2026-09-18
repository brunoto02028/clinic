# T-7: QA consolidada

**Status:** concluído (evidência em `qa/report-t-1-t-6.md`, `qa/report-t-1-t-6-addendum.md` e `qa/report-t-1-t-6-review-fixes.md` — cobre os 8 eventos, a troca do email em `/admin/settings`, e a reverificação pós-correção do vazamento entre tenants)
**Depende de:** T-1, T-2, T-3, T-4, T-5, T-6

## Objetivo
Confirmar que todos os alertas novos disparam corretamente, o BCC antigo continua funcionando, e o email configurável em `/admin/settings` realmente muda o destino.

## Passos
1. Disparar cada um dos 8 eventos (cadastro, pressão alta, cancelamento pela paciente, avaliação corporal, pé, pagamento, pacote, consentimento) num ambiente de teste e confirmar o alerta dedicado chegando (via um provedor de email de teste/log, já que não dá pra checar inbox real).
2. Confirmar que os 4 eventos que já tinham alerta (agendamento, triagem, mensagem, pergunta) continuam funcionando sem duplicar nem quebrar.
3. Trocar o `notificationEmail` em `/admin/settings` e confirmar que os alertas passam a ir pro endereço novo.
4. Deixar `notificationEmail` em branco e confirmar que volta pro fallback (`email` de contato → `ADMIN_EMAIL` → hardcoded).
5. Cancelamento pelo próprio admin não dispara o alerta novo (só o de paciente cancelando).

## Arquivos afetados
- Nenhum (só QA)

## Critérios de aceite
- [ ] Todos os 8 eventos novos confirmados com evidência (output do provedor de email de teste, ou captura de log de envio).
- [ ] Os 4 eventos existentes confirmados sem regressão.
- [ ] Troca de endereço em `/admin/settings` confirmada funcionando.
