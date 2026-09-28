# Atividade 098 — O paciente escolhe o formato, a clínica aprova

**Aberta em:** 28/09/2026
**Pedido do Bruno:** *"Quero que o paciente escolha consulta por vídeo ou
presencial ou na casa dele, mas depende da aprovação da clínica."*

## O que existe hoje, e o que falta

A consulta por vídeo **funciona inteira** — sala, janela de dez minutos antes,
botão no app, aviso no telefone. O que não existe é o pedido: quem decide o
formato é só a clínica, num campo **Formato** dentro do `Edit` da consulta. A
tela de agendar do app pergunta *para quem é*, o serviço, a data e a hora —
**e nada sobre formato**.

Três coisas já estão no banco e mudam o trabalho:

**1. `AppointmentMode` só tem dois valores:** `IN_PERSON` e `VIDEO`. O
atendimento em casa **não existe** como conceito — é um valor novo.

**2. `TreatmentType.requiresInPerson` já existe**, com o comentário *"false for
consultations"*. Ou seja, a clínica **já** sabe dizer quais tratamentos podem
ser à distância. O vídeo não precisa de campo novo: precisa ser lido.

**3. Não há aprovação de nada hoje.** Consulta marcada pelo app nasce
`CONFIRMED` (ou `PENDING` esperando pagamento). O conceito de "a clínica ainda
vai decidir" não existe na agenda.

## A decisão de desenho

**O horário é do paciente na hora em que ele marca. O formato é um pedido.**

A consulta nasce como **presencial na clínica** e guarda, ao lado, o formato
pedido. Enquanto ninguém decidir, a consulta existe, está no calendário e
ninguém perdeu nada — o que está em aberto é *onde* ela acontece, não *se*
acontece.

A alternativa — segurar a consulta inteira até alguém aprovar — foi descartada:
um pedido de atendimento em casa feito no sábado deixaria o paciente sem
consulta marcada até segunda, por causa de uma preferência.

**Recusar não cancela.** Recusado o vídeo ou o domicílio, a consulta continua de
pé, presencial, e a pessoa é avisada do motivo. Cancelar por causa do formato
faria a clínica perder a consulta junto com o pedido.

## O que o paciente pode pedir, e quando

| formato | oferecido quando |
|---|---|
| **Na clínica** | sempre — é o padrão, e não é pedido: é o que acontece |
| **Por vídeo** | o tipo de tratamento tem `requiresInPerson: false` |
| **Na minha casa** | o tipo de tratamento tem `allowsHomeVisit: true` **e** o cadastro tem endereço, cidade e código postal |

**Nada de oferecer o que não pode acontecer.** Eletroterapia não vira vídeo, e
o domicílio sem endereço é um pedido que a clínica não consegue atender — é o
mesmo critério que tirou o botão do Google do Android.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O banco e a regra de quem pode pedir o quê | — | pendente |
| T-2 | O paciente escolhe, no app | T-1 | pendente |
| T-3 | A clínica decide: a fila e o aprovar/recusar | T-1 | pendente |
| T-4 | O que o paciente vê depois da decisão | T-3 | pendente |
| T-5 | Ligar o domicílio por tipo de tratamento | T-1 | pendente |

**Ordem:** T-1 primeiro (é schema). T-3 e T-5 são web e sobem sem build. T-2 e
T-4 são app e **esperam um build**.

## Suposições — confirme antes de eu implementar

1. **O preço não muda com o formato.** Atendimento em casa costuma custar mais
   (deslocamento), e isto não cobre isso: a consulta mantém o preço do tipo de
   tratamento. Se tiver de mudar, é um acréscimo por tipo, e vira T-6.
2. **O endereço vem do cadastro**, não de um campo novo no agendamento — a 081
   já separou cidade e código postal. Quem não tem endereço completo não vê a
   opção de domicílio, e a tela diz por quê.
3. **Nenhum aviso automático chega ao paciente.** A decisão aparece no app
   quando ele abre, e a clínica tem um **botão** para avisar. É a regra que
   vale desde 17/09 e ela não muda por causa disto.
4. **Recusar pede um motivo**, e o motivo é mostrado à pessoa. Uma recusa muda
   mesmo onde ela vai estar naquela hora; "não" sem frase faz ela ligar para a
   clínica para perguntar.
5. **Quem decide é terapeuta ou admin da clínica dona da consulta** — a mesma
   regra dos botões de vídeo, que só aparecem para o terapeuta daquela consulta.
6. **Quem já tem consulta marcada não ganha o pedido retroativo.** O pedido
   nasce no agendamento. Mudar o formato de uma consulta que já existe continua
   sendo coisa do painel.

## O que esta atividade **não** faz

- Não mexe na consulta por vídeo em si — sala, janela e aviso ficam como estão.
- Não cria rota de atendimento domiciliar, nem cálculo de distância.
- Não muda a web do paciente ([[paridade-web-app-paciente]]: o app é o alvo).
