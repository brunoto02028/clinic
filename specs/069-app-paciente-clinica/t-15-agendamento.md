# T-15: Agendamento — fuso horário e dados de outro tenant

**Status:** implementado (aguardando QA)
**Depende de:** nenhuma

## Objetivo
Fazer o horário agendado pelo app ser o mesmo que a clínica vê, e a confirmação mostrar a clínica certa.

## Contexto
Achados da T-11.

### Desvio de 1 hora durante o horário de verão britânico
`mobile/app/(app)/(clinica)/book-appointment.tsx:57` monta a data assim:

```
`${data}T${hora}:00.000Z`
```

Trata o horário local como se fosse UTC. A web usa `zonedTimeToUtc`. Medido: paciente escolhe **09:00 em 23/09** → a web grava `08:00Z` (agenda mostra 09:00), o app grava `09:00Z` e **a agenda mostra 10:00**.

São **60 minutos de desvio durante o BST** (março a outubro) e zero no inverno — o pior tipo de bug, porque some sozinho e volta. Paciente e clínica combinam horários diferentes sem ninguém perceber a causa.

### Confirmação com dados de outro tenant
`booking-confirmed.tsx` mostra **"12 Crown Street, Ipswich IP1 3HA"** e **"Bruno will review it"** — fixos. Para paciente de outra clínica, apresenta como fato o endereço e o terapeuta errados. Num produto multi-tenant, manda o paciente para o lugar errado.

Ainda: "Add to calendar" é no-op, hoje nunca é agendável, e não dá para escolher terapeuta nem forma de pagamento.

## Passos
1. Converter o horário com a mesma biblioteca e o mesmo fuso que a web (`zonedTimeToUtc`), não montando string com `Z`.
2. Testar explicitamente uma data **dentro** e uma **fora** do BST — o bug é sazonal e passa despercebido no inverno.
3. `booking-confirmed`: buscar endereço e terapeuta do tenant do paciente.
4. Remover o "Add to calendar" ou implementá-lo.
5. Verificar se há agendamento **já gravado com desvio em produção**.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `mobile/app/(app)/(clinica)/booking-confirmed.tsx`
- `mobile/src/api/booking.ts`

## Critérios de aceite
- [ ] Horário gravado pelo app == horário gravado pela web, para a mesma escolha
- [ ] Testado dentro e fora do BST
- [ ] Confirmação mostra o endereço e o terapeuta do tenant do paciente
- [ ] Nenhum botão no-op
- [ ] Levantamento de agendamentos já afetados, com resultado no report
