# QA — T-5: Visibilidade para o admin — badge "a pagar no local"

**Resultado: ✅ aprovado**

Ambiente: local (`npm run dev` na porta 4001, banco `bpr_clinic_local`), logado como
`qa.admina@example.test`.

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Lista admin mostra badge "Pay in person" em consulta IN_PERSON | UI | ✅ |
| 2 | Consulta ONLINE não mostra badge extra | UI | ✅ |
| 3 | Detalhe IN_PERSON não paga → estado distinto, preço visível, "Pay Now" clicável | UI | ✅ |
| 4 | Detalhe ONLINE não paga → "Payment Pending" inalterado | UI | ✅ |

## Evidências

- `/admin/appointments` mostra 6 consultas de teste; só a `CONFIRMED` criada com `IN_PERSON` tem
  o badge azul "Pay in person" ao lado do status — as outras 5 (4 `PENDING` ONLINE + 1
  `CONFIRMED` ONLINE pré-existente) não têm. Screenshot: `t-5-admin-lista-badge.png`.
- Bônus: a lista do lado paciente (`components/appointments/appointments-list.tsx`, também
  tocada no diff) mostra o mesmo badge ("Pagar no local") corretamente.
- Detalhe da consulta IN_PERSON não paga (`/dashboard/appointments/[id]`, card "Pagamento"):
  "A pagar presencialmente" / "Pague na clínica no dia da consulta." com ícone azul, preço
  £100.00 visível, botão "Pagar Agora" ainda clicável. Screenshot:
  `t-5-detalhe-in-person-pt.png`.
- Mesma tela para consulta ONLINE não paga: "Pagamento Pendente" (ícone âmbar), sem o texto
  extra — visualmente idêntico ao comportamento anterior. Screenshot:
  `t-5-detalhe-online-pendente-pt.png`.
