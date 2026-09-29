# T-3: O paciente sabe, antes de confirmar, se vai pagar agora

**Status:** pendente
**Depende de:** T-2

## Objetivo

Que ninguém toque em "Confirmar" sem saber o que vem a seguir.

## Contexto

Com `INVOICE` a tela já diz *"GBP 100.00 added to your invoice"*. Com
`AT_BOOKING` abre a folha do Stripe logo depois de confirmar.

São duas experiências bem diferentes atrás do mesmo botão, e hoje só uma delas
se anuncia. Quem espera pagar e não paga fica em dúvida se agendou; quem não
espera pagar e vê o cartão aparecer, desiste.

## Passos

1. O botão diz o que vai acontecer: **"Confirmar e pagar"** quando há pagamento
   no ato; **"Confirmar agendamento"** quando não há.
2. A linha do preço diz qual é o acerto: *"a pagar agora"* contra *"vai para a
   sua fatura"*.
3. Quando o pagamento confirma o horário, a tela diz isso **antes**: a consulta
   fica pendente até o pagamento entrar.
4. Fechar a folha do Stripe não prende o horário — isso já é verdade, e passa a
   estar escrito.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `__tests__/agenda/o-botao-diz-o-que-faz.test.ts`

## Critérios de aceite
- [ ] O rótulo do botão muda com a regra da clínica.
- [ ] O preço diz se é agora ou na fatura.
- [ ] Nas duas línguas.
- [ ] Nenhuma frase promete confirmação antes de o pagamento entrar.
