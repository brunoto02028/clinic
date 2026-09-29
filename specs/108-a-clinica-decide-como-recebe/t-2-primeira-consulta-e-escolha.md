# T-2: A primeira consulta também é uma escolha

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a clínica decida se paciente novo paga antes de o horário valer.

## A resposta do Bruno, 29/09/2026

> *"Se o paciente é primeira consulta e ele não fez contato com a clínica, ele
> **tem que pagar**, senão não pode liberar o slot. E se já é um retorno, aí a
> própria clínica agenda."*

Isso confirma o padrão e muda o peso da tarefa: `AT_BOOKING` não é só o valor
inicial, é **a regra da casa** para quem chega sozinho pelo aplicativo. A opção
de faturar existe para o caso de a clínica querer — e o retorno, que é quem já
tem relação, é marcado pela clínica, sem passar por aqui.

**O "senão não pode liberar o slot" já funciona**, e foi medido: quem está
pagando segura a vaga por **30 minutos** e depois a solta
(`limiteDeEspera`, em `lib/schedule.ts`). Checkout abandonado não prende
horário.

## Contexto

`bookingOptionsFor` devolve `requiresPayment: true` **fixo** para a primeira
consulta. A intenção era boa e continua defensável — paciente novo, sem
relação, e o pagamento é o que transforma um desconhecido num horário
reservado.

Mas o Bruno pediu o contrário como possibilidade:

> *"Se deixa liberado para agendar pagando, ou também sem pagar e pagar da
> forma que o paciente escolher, pessoalmente ou transferência bancária."*

São clínicas diferentes com riscos diferentes, e é dela a decisão.

## Passos

1. `firstConsultationPayment` no `Clinic`, mesmos dois valores da sessão extra,
   **padrão `AT_BOOKING`** — que é o comportamento de hoje.
2. `bookingOptionsFor` passa a lê-lo em vez do `true` fixo.
3. Entra na seção da T-1, ao lado da sessão extra.
4. Um teste para cada combinação: o que nasce `PENDING` esperando pagamento e o
   que nasce `CONFIRMED` para acertar depois.

## O que esta tarefa **não** faz

Mexer na sessão do pacote. Ela já foi paga quando o paciente comprou o pacote, e
cobrar de novo seria cobrar duas vezes.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/booking-options.ts`
- a tela da T-1
- `__tests__/agenda/quem-paga-antes.test.ts`

## Critérios de aceite
- [ ] O padrão é o comportamento de hoje: primeira consulta paga no ato.
- [ ] Com `INVOICE`, a primeira consulta nasce confirmada e vai para a fatura.
- [ ] Com `AT_BOOKING`, nasce pendente e o webhook é quem confirma.
- [ ] O pacote continua intocado.
