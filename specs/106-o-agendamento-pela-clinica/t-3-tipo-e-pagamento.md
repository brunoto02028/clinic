# T-3: Tipo e pagamento, sem camisa de força

**Status:** 🟢 concluída (29/09) — aguardando QA
**Depende de:** nenhuma

## Objetivo

Dar ao agendamento feito pela clínica a liberdade que o Bruno pediu.

## Contexto — e por que está bloqueada

> *"Eu quero poder escolher o tipo de tratamento ali, que no caso só tem
> tratamento condicionado e pago, e eu não quero isso."*

Não entendi o que falta, e **adivinhar aqui sairia caro**: mexe em preço.

O que o diálogo já oferece hoje, medido no print e no código: tipo de tratamento
com preço e duração, formato (clínica, vídeo, domicílio), modo de pagamento (na
clínica, online), *sessão cortesia* — sai do pacote mesmo esgotado — e *isentar a
cobrança* — preço zero.

Gratuito, portanto, já é possível. As leituras que sobram:

| | o que seria |
|---|---|
| **(a)** | criar um tipo novo ali na hora, sem sair para outra tela |
| **(b)** | marcar **sem** tipo nenhum — só nome, hora e duração |
| **(c)** | mudar preço e duração **naquele** agendamento, sem mexer no cadastro |
| **(d)** | outra coisa que eu não enxerguei |

## A resposta do Bruno, 29/09/2026

> *"Tratamento será colocado pelo terapeuta. Paciente só precisa ter liberdade,
> de acordo com a agenda, de agendar uma consulta, que só será confirmada
> depois do pagamento. O paciente que já conhecemos, se do lado da clinic a
> clínica quiser agendar algo com aquele paciente específico, ela pode fazer
> isso sem envolver pagamento."*

São **dois caminhos com regras opostas**, e o sistema já tinha os dois:

| quem marca | o que acontece |
|---|---|
| o paciente | nasce `PENDING`, e o **pagamento é o que confirma** |
| a clínica | pode marcar **sem cobrança**, e aí nasce `CONFIRMED` |

O que faltava não era nenhum dos dois. Era **a tela mostrar o segundo**.

## O que estava acontecendo

O tipo de tratamento sempre foi opcional — no envio (`handleCreateAppointment`
só exige paciente, data e hora) e no servidor (`precoFinal <= 0` faz a consulta
nascer confirmada). Mas o seletor só oferecia tipos **com preço**, então marcar
sem cobrança dependia de adivinhar que dava para deixar o campo em branco.

Um caminho que existe e não se vê é o mesmo que não existir — e foi isso que fez
o Bruno descrever o diálogo como *"tratamento condicionado e pago"*.

## O que foi feito

1. O seletor ganhou a primeira opção: **"Sem tipo ainda — sem cobrança"**.
   Escolhê-la zera o preço, senão trocar de um tipo pago para ela deixaria o
   preço anterior para trás e a consulta nasceria cobrando.
2. Preço zero **não oferece modo de pagamento**. Perguntar "na clínica ou
   online" quando não há o que pagar é a mesma espécie de mentira que a T-1
   tirou do cabeçalho: promete uma decisão que não existe.

## Critérios de aceite
- [x] O Bruno disse qual é: os dois caminhos coexistem.
- [x] A clínica marca sem tipo e sem cobrança, e isso é **visível**.
- [x] Escolher "sem tipo" zera o preço.
- [x] Sem preço, nenhum modo de pagamento é oferecido.
- [x] O caminho do paciente continua o oposto: paga para confirmar.
- [ ] QA na tela.
