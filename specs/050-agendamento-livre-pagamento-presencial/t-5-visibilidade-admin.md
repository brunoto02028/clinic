# T-5: Visibilidade para o admin — badge "a pagar no local"

**Status:** concluído
**Depende de:** T-1, T-4

## Objetivo
O admin/terapeuta vê claramente, na lista e no detalhe da consulta, quando o paciente
escolheu pagar presencialmente — sem precisar adivinhar pelo status.

## Contexto
Ver decisão D1, D5 em `plan.md`.

## Passos
1. **Lista admin** (`app/admin/appointments/page.tsx`, dentro do `.map` em torno da linha
   704-721, ao lado do badge de status já existente): se
   `appointment.paymentMethod === "IN_PERSON"`, mostrar um segundo badge pequeno, ex.:
   ```tsx
   {appointment.paymentMethod === "IN_PERSON" && (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600">
       {relabel("Pay in person")}
     </span>
   )}
   ```
   Confirmar que `GET /api/appointments` já devolve `paymentMethod` no objeto (é campo direto
   do model, não precisa de include/select adicional — mas checar se a rota usa `select`
   explícito em algum lugar que precisaria listar o campo).
2. **Detalhe da consulta** (`components/appointments/appointment-detail.tsx`, card "Payment"
   por volta da linha 527-583): quando `appointment.paymentMethod === "IN_PERSON"` e
   `payment?.status !== "SUCCEEDED"`, mostrar um estado visualmente distinto do "Pagamento
   Pendente" atual — mesma estrutura do bloco `hasActivePackage` (linha 547-556) mas com texto
   "A pagar presencialmente na clínica" / "To be paid in person at the clinic", mantendo o
   preço visível. Não remover o botão "Pay Now" — o paciente pode mudar de ideia e pagar online
   mesmo tendo escolhido presencial.
3. Repetir o mesmo badge (passo 1) em qualquer outra lista de consultas relevante do admin/
   terapeuta que já mostre o badge de status, se existir mais de uma (checar
   `app/dashboard/appointments` do lado terapeuta/staff antes de fechar a tarefa).

## Arquivos afetados
- `app/admin/appointments/page.tsx`
- `components/appointments/appointment-detail.tsx`
- (possível) outra lista de consultas do lado staff, se existir

## Critérios de aceite
- [ ] Consulta com `paymentMethod: IN_PERSON` mostra o badge na lista admin.
- [ ] Detalhe da consulta mostra o estado "a pagar presencialmente" distinto de "Pagamento
      Pendente", com preço visível e botão "Pay Now" ainda disponível.
- [ ] Consulta `ONLINE` (comportamento atual) não muda visualmente em nada.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos nos arquivos tocados.
