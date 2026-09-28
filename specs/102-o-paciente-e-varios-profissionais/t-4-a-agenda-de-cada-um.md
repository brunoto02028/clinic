# T-4: A agenda de cada profissional

**Status:** pendente
**Depende de:** T-1

## Objetivo

Cada profissional tem a própria disponibilidade, e o paciente vê **a agenda de
quem ele escolheu** — não a da clínica.

## Contexto

`ScheduleWindow` e `ScheduleException` já têm `therapistId`. O que responde
hoje é `/api/availability`, **sem** o id da pessoa: é a disponibilidade da
clínica.

Isso foi deliberado e está comentado na agenda: passar o id de quem estava
logado fazia o painel e o app discordarem sobre o mesmo dia, e um segundo
terapeuta sem janela própria via a semana inteira fechada. A saída foi tirar o
id — **e a dívida ficou escrita ali**: *"modelar agenda por pessoa é outra
atividade"*. Esta é a atividade.

## Passos

1. `/api/availability` aceita `professionalId` e responde pela pessoa.
2. Sem `professionalId`, continua respondendo pela clínica — para a agenda da
   reabilitação não mudar.
3. Profissional sem janela configurada **não aparece como disponível**, em vez
   de aparecer com a semana inteira aberta ou fechada.
4. Fuso: o profissional pode estar no Brasil e o paciente em Londres. O horário
   mostrado é o do **paciente**, e o guardado é UTC.

## Critérios de aceite

- [ ] Dois profissionais com janelas diferentes devolvem vagas diferentes.
- [ ] Quem não configurou janela não é oferecido.
- [ ] O painel e o app concordam sobre o mesmo dia, para a mesma pessoa.
- [ ] Uma consulta marcada em Londres aparece no horário certo dos dois lados.
