# T-3: O que não se atualiza sozinho

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a atualização automática não apague o que a pessoa estava escrevendo.

## Contexto

É a parte que costuma ser descoberta pelo usuário. O app volta ao primeiro plano,
tudo é invalidado, e o formulário de agendamento meio preenchido volta ao zero —
ou pior, a consulta que ele estava confirmando muda de horário debaixo do dedo.

## Passos

1. Levantar as telas com estado não gravado: agendar, mensagem em rascunho,
   check-in diário, lançar pressão.
2. Nelas, atualizar o que é **pano de fundo** e não o que está sob o dedo.
3. Onde o dado de fundo mudou e importa — o horário deixou de existir — avisar,
   em vez de trocar em silêncio.

## Critérios de aceite

- [ ] Formulário meio preenchido sobrevive a sair e voltar
- [ ] Horário que sumiu é avisado, não trocado calado
- [ ] Mensagem em rascunho não se perde
