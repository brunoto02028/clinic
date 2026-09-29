# Atividade 104 — O paciente escolhe, e o profissional atende

## Objetivo

> O Bruno, 29/09/2026: *"quando um paciente vai agendar uma consulta, ele não
> consegue... esse fluxo precisa estar mais claro. Os valores podem variar dos
> tipos de consulta ou retorno... a clinic cadastra o valor e aparece ai. Cada
> profissional futuramente vai ter a sua área no sistema e sua agenda, e isso
> precisa refletir no app do paciente."*
>
> E: *"pense na experiência do paciente e pense como um médico com sua área no
> sistema que vai atender o paciente pelo app."*

## O que eu encontrei antes de propor

A 102 entregou mais do que parece. **Cada profissional já é um inquilino**, e
`ServicePrice` é por inquilino — então **preço por profissional já existe**, e o
catálogo até devolve o de cada um (`price: await patientBookingPrice(c.id)`).

O que está errado é outra coisa, e é pior:

| achado | onde |
|---|---|
| **A porta de agendamento cobra pela clínica do paciente**, não pela do profissional escolhido | `lib/booking-options.ts:114` — `const clinicId = paciente.clinicId` |
| O catálogo mostra "£150" e a tela de marcar mostra "£100" | a diferença é silenciosa |
| O fluxo cai direto em data e hora | sem perguntar *o que você precisa* |
| "Extra session" e "First consultation" são o mesmo cartão cinza | o paciente não sabe o que está comprando |
| Preço só existe por `serviceType` (4 valores), não por **modalidade** | `ServiceType` = CONSULTATION, TREATMENT_SESSION, FOOT_SCAN, BODY_ASSESSMENT |

E três travas que deixam as telas vazias — **nenhuma delas é código**: sem Stripe
em produção ninguém aparece no catálogo (por desenho), sem tipo de tratamento não
há o que escolher, e os interruptores de vídeo e domicílio nascem desligados.

## Decisões de design

### 1. O preço segue quem vai atender

Um número que muda entre a tela que oferece e a tela que cobra não é erro de
interface: é a pessoa sendo cobrada por algo diferente do que escolheu. Esta é a
primeira tarefa, sozinha, porque é defeito e não melhoria.

### 2. O fluxo começa pela pergunta certa

Hoje ele começa em "quando". A pergunta do paciente é **"o que eu preciso?"** —
e só depois com quem, e só depois quando. Um fluxo que começa pelo calendário
obriga a escolher data antes de saber o que está marcando.

### 3. Primeira consulta e retorno são coisas diferentes, e o app diz isso

"Extra session £100 added to your invoice" não diz a uma pessoa o que ela está
comprando. Primeira consulta é a porta de entrada — avaliação, e por isso paga
antes. Retorno é continuidade. Quem já tem pacote não paga nada, e isso precisa
estar dito, não deduzido de um cartão cinza.

### 4. O profissional manda na própria área

Um médico com área no sistema precisa de duas coisas para atender pelo app:
**o preço dele** e **a agenda dele**. As duas já existem no modelo; falta a tela
dele e falta o app ler dali.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O preço segue o profissional escolhido](t-1-o-preco-segue-quem-atende.md) | pendente |
| T-2 | [O que você precisa, com quem, e quando](t-2-a-ordem-das-perguntas.md) | pendente |
| T-3 | [Primeira consulta e retorno, ditos com clareza](t-3-primeira-vez-e-retorno.md) | pendente |
| T-4 | [O profissional manda na própria área](t-4-a-area-do-profissional.md) | pendente |

**T-1 é defeito e vai primeiro.** T-2 e T-3 são a mesma tela e saem juntas. T-4
é o lado do profissional e é independente.

## Suposições — para você validar

1. **Preço por modalidade sai do inquilino**, e não de um campo novo: o médico é
   um inquilino, e o preço dele é o `ServicePrice` dele. Se um mesmo médico
   precisar de dois preços — consulta e retorno —, os dois `serviceType` que já
   existem dão conta.
2. **Quem detém o paciente continua sendo a reabilitação.** Escolher um médico
   não muda a casa dele; muda quem atende aquela consulta.
3. **O paciente não escolhe profissional para a primeira consulta da
   reabilitação** — ela é com a casa. Escolher profissional é para as
   modalidades.
4. **A exceção de preço por paciente** (`PatientServicePrice`) continua valendo,
   e vale sobre o preço do profissional também.
5. **Sem Stripe, o profissional não aparece** — e isso não muda nesta atividade.
