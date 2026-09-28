# T-3: A clínica marca, o paciente vê, paga — e está confirmado

**Status:** pendente
**Depende de:** nenhuma (independente da T-1 e da T-2)

## Objetivo

O Bruno, ao telefone com um paciente, marca a consulta pelo painel: escolhe o
paciente, o formato (presencial, por vídeo, ou na casa dele) e o horário. Isso
aparece no app do paciente, ele paga, e **o pagamento é a confirmação**.

## Contexto

> *"Do lado da clínica, eu quero poder agendar uma consulta e atribuir a um
> paciente específico. E também poder escolher o tipo de consulta — se é por
> vídeo, presencial, na casa do paciente —, atribuir aquele paciente que falou
> com você por telefone, e determinar os horários. E claro que isso vai refletir
> lá no aplicativo, na área do paciente. E o paciente vai ter que pagar e fazer a
> confirmação do agendamento."*
>
> *"No pagamento já é a confirmação do agendamento."*

Boa parte já existe:

- `/admin/appointments` marca com os **três formatos** (098) e escolhe paciente,
  data, hora, duração e preço.
- A [098](../098-o-paciente-escolhe-o-formato/) fez o caminho contrário — o
  paciente **pede** um formato e a clínica aprova.
- A [093](../093-a-fatura-do-paciente/) fez o paciente pagar no app.

O que falta ligar: a consulta marcada pela clínica **nascer aguardando
pagamento**, e o pagamento **mover o estado** para confirmada. Hoje ela nasce
`PENDING` ou `CONFIRMED` conforme quem marca, e o pagamento é uma outra coisa,
ao lado.

## Passos

1. Levantar o que já existe e onde ele para (`kind: CLINIC_BOOKED`, `paid`,
   `status`, e a fatura da 093).
2. Definir o estado da consulta marcada pela clínica até o pagamento, e o que o
   paciente lê enquanto isso.
3. Ligar o pagamento à confirmação — **num lugar só**, para os dois caminhos
   (cartão no app e cobrança fora dele) concordarem.
4. Cortesia (`waiveCharge`, preço zero) nasce confirmada: não há o que pagar.
5. O aviso ao paciente continua sendo **um botão**, nunca automático.
6. Seletor de terapeuta — ou a decisão explícita de não ter um (ver suposição 1
   do `plan.md`).

## Arquivos afetados

*(a preencher)*

## Critérios de aceite

- [ ] A clínica marca para um paciente escolhido, com formato e horário.
- [ ] A consulta aparece no app **dizendo que espera pagamento**.
- [ ] Pagou ⇒ confirmada, sem um segundo botão de confirmar.
- [ ] Cortesia nasce confirmada.
- [ ] Nada sai para o paciente sem alguém apertar um botão.
- [ ] Cancelar antes de pagar não deixa cobrança órfã.
