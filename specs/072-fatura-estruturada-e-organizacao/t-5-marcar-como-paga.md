# T-5: Marcar fatura como paga (manual, origem não-Stripe)

**Status:** concluído
**Depende de:** T-1, T-4

## Objetivo

Fechar o ciclo de status pra faturas que NÃO nasceram já pagas via Stripe
(T-2 já cobre o caso automático) — fatura avulsa, agendamento pago por
outro método, assinatura não-Stripe.

## Contexto

Botão na seção de faturas (T-4), escondido quando `paidMethod ===
"stripe"` (ali já está pago, não faz sentido reabrir). Também cobre marcar
como `VOID` (cancelada) e `OVERDUE` calculado na leitura quando `dueDate`
passou e ainda não foi paga (sem precisar de cron novo).

## Passos

1. `PATCH /api/admin/invoices/[id]` — body `{ status, paidAmount?,
   paidMethod?, notes? }`. Ao marcar `PAID`: seta `paidAt = now()`,
   `paidById = actor.id`, valida `paidAmount` (default = `total` se não
   informado). Escopado por `clinicId`, mesma disciplina de sempre.
2. UI: botão "Mark as paid" (com campos opcionais de valor/método),
   botão "Void" — ambos com confirmação, já que mudam um registro
   financeiro.
3. `OVERDUE` calculado na leitura (T-4's `GET`): se `status === SENT` e
   `dueDate` no passado, exibir como "Overdue" na lista/detalhe sem
   precisar persistir isso (evita mais um cron) — decidir se vale
   persistir depois, não nesta v1.

## Arquivos afetados

- `app/api/admin/invoices/[id]/route.ts` (PATCH)
- `app/admin/invoices/[id]/page.tsx`

## Critérios de aceite

- [ ] Marcar como paga registra quem e quando, e reflete na lista/detalhe.
- [ ] Staff de outra clínica não consegue marcar fatura de clínica alheia
      como paga (404, mesma disciplina de tenant).
- [ ] "Overdue" aparece corretamente pra fatura enviada com `dueDate`
      vencido e ainda não paga, sem exigir nenhum job novo.
