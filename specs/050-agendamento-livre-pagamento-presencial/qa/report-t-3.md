# QA — T-3: Escolha de forma de pagamento na tela de agendamento

**Resultado: ✅ aprovado**

Ambiente: local (`npm run dev` na porta 4001, banco `bpr_clinic_local`). Pacientes de teste:
`qa.pacientea@example.test` (sem pacote) e `qa.pacientea2@example.test` (com `PatientSubscription`
ativa).

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Sem pacote ativo, escolha visível, ONLINE pré-selecionado | UI | ✅ |
| 2 | Com pacote ativo, escolha oculta | UI | ✅ |
| 3 | Escolher IN_PERSON e confirmar → texto "já confirmada, pague na clínica" (en-GB) | UI | ✅ |
| 4 | Escolher ONLINE e confirmar → texto atual mantido (pt-BR) | UI | ✅ |
| 5 | POST inclui `paymentMethod` batendo com a escolha | API | ✅ |

## Evidências

- **Cenário 1**: no resumo do passo 2, "How will you pay?" com "Pay online now" pré-selecionado
  e destacado / "Pay in person" disponível.
  Screenshot: `qa/screenshots/t-3-resumo-online-preselecionado.png`.
- **Cenário 3**: clicando em "Pay in person" e confirmando, o request real capturado via
  Network foi:
  ```
  POST /api/appointments
  {"dateTime":"2026-09-18T09:00:00.000Z", ..., "paymentMethod":"IN_PERSON"}
  → 200 { appointment: { status: "CONFIRMED", paymentMethod: "IN_PERSON", ... } }
  ```
  Tela de sucesso: "Appointment Confirmed!" / "Your appointment is already confirmed. Pay at
  the clinic on the day."
  Screenshots: `t-3-pay-in-person-selecionado.png`, `t-3-confirmacao-in-person-en.png`.
- **Cenário 4** (pt-BR + ONLINE): resumo mostra "Como você vai pagar?" / "Pagar online agora" /
  "Pagar presencialmente" (screenshot `t-3-resumo-pt-br.png`). Confirmando com ONLINE (padrão):
  tela final "Pedido Enviado!" / "Recebemos o seu pedido de consulta. Irá receber um email de
  confirmação com os detalhes e o link de pagamento." — texto idêntico ao comportamento
  anterior, sem regressão. Screenshot: `t-3-confirmacao-online-pt.png`. Zero erros de console.
- **Cenário 2** (pacote ativo): no resumo, nem o preço estimado nem a escolha de pagamento
  aparecem (screenshot `t-3-pacote-ativo-sem-escolha.png`). Confirmado via Network que o POST
  disparado mandou `"paymentMethod":"ONLINE"` mesmo sem UI de escolha — bate com o código
  (`hasActivePackage ? "ONLINE" : paymentMethod`).
