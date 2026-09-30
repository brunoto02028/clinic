# T-3: O paciente arruma o próprio app

**Status:** pendente
**Depende de:** T-2

## Objetivo

Que o paciente possa segurar e arrastar as linhas do menu dele, e que aquilo
sobreviva a fechar o app.

## Contexto

É o terceiro dono da ordem, e o último da cascata: a dele ganha da clínica, que
ganha do alfabeto.

**A pergunta que o Bruno precisa responder** está no `plan.md`: quando a clínica
reordenar **depois**, a ordem do paciente continua valendo? A proposta é que sim.

## Passos

1. A ordem do paciente é **dado no servidor**, não preferência local: ele troca
   de telefone e a arrumação tem de ir junto.
2. O gesto de arrastar no app compete com o de puxar para atualizar (atividade
   113). As duas mexem na mesma tela e é melhor que saiam juntas.
3. Um jeito de voltar atrás, que é a T-4.

## Critérios de aceite

- [ ] Arrastar no app muda a ordem, e ela volta igual depois de fechar
- [ ] A ordem viaja com a conta, não com o aparelho
- [ ] Arrastar não dispara a atualização por puxar
- [ ] O que a clínica desligou continua fora, esteja onde estiver na ordem
