# T-8: A hora que o paciente lê

**Status:** 🟢 concluída (29/09) — falta QA na tela
**Depende de:** T-7 (o mesmo bloco de envio)
**Origem:** varredura minha depois da T-7, não planeada.

## O que aconteceu

O commit `eb707ed23` diz *"an email an hour behind the screen"*. Corrigi **4
chamadas**. Varri a classe depois e achei **11 outras** —
`toLocaleTimeString`/`toLocaleDateString` sem `timeZone` — em 9 arquivos do
servidor.

O contêiner roda em **UTC**. Durante os sete meses de horário de verão britânico,
todas elas mostram **uma hora a menos** que a realidade. Hoje é 29 de setembro:
está acontecendo agora.

## O que o Bruno escolheu

Varrer os **5 caminhos que o paciente lê** neste deploy; os 4 internos (alerta ao
admin, command-chat, PDF de SOAP, agente de voz) ficam para depois.

| arquivo | o que mostrava errado |
|---|---|
| `app/api/patient/notifications/route.ts` | a hora da próxima consulta **dentro do app** |
| `app/api/appointments/[id]/reschedule/route.ts` | o e-mail de remarcação, hora antiga **e** nova |
| `lib/waitlist.ts` | *"a slot opened at HH:MM"* para quem está na fila |
| `app/api/payments/create-checkout/route.ts` | a descrição do que ele está pagando |
| `app/api/cron/appointment-reminders/route.ts` | o lembrete — **não dispara**, crons desligados desde 17/09 |

Total: **12 chamadas** corrigidas (alguns arquivos tinham duas).

## Um defeito maior no mesmo lugar: o **dia**

`app/api/patient/notifications/route.ts` decidia "hoje" e "amanhã" com
`toDateString()`, que lê o fuso do processo. Uma consulta às 00:30 de terça em
Londres cai às 23:30 de segunda em UTC — e o app dizia *"Consulta Hoje"* na
segunda, ou deixava de dizer na terça. Ali a hora saía errada; aqui o dia.

Agora compara datas pelo relógio da clínica, com `getZonedDateString`.

## A decisão sobre a fila de espera

Cancelar uma consulta avisa até **5** pessoas da fila. Perguntado, o Bruno
respondeu: *"sempre notificar no app e email"*.

Era e-mail só — e nem sempre. `notifyPatient` escolhe **um** canal pela
preferência da pessoa, então quem tem WhatsApp ou SMS marcado **nunca** recebia o
e-mail. Para uma vaga perecível é o pior arranjo possível: o canal preferido pode
falhar em silêncio e ninguém fica sabendo.

- `pushVagaNaFila` novo em `lib/push-notify.ts` — *"A slot opened up / Um horário
  que você esperava ficou livre"*, sem dizer que tratamento é, porque a
  notificação aparece na tela bloqueada.
- `forceChannel: "EMAIL"` no `notifyPatient`, para a carta sair sempre.
- O push vem primeiro: é o que chega em segundos.

Fica registado como **exceção consciente** à regra de 17/09, e não como defeito
esquecido: uma fila que não avisa não é fila.

## O que esta tarefa mudou no jest, e por quê

**`jest.config.js` agora põe o processo em `TZ=UTC`.**

A máquina do Bruno é `Europe/London`. Ali um `toLocaleTimeString` **com** e
**sem** `timeZone` dá a mesma resposta — então o teste que compara com o relógio
de Londres passa nos dois casos. Foi assim que um e-mail uma hora atrasado
sobreviveu a uma suíte verde.

Eu caí nisso: escrevi `process.env.TZ = "UTC"` no topo do teste, ele passou, e a
**prova por mutação mostrou que não media nada** — o worker do jest já fez contas
com datas antes, e o Node cacheia o fuso no primeiro uso. Tem de ser no config,
que é lido no processo principal antes de os workers nascerem.

Medido antes de ligar: a suíte inteira passa em UTC.

## Critérios de aceite

- [x] As 5 rotas do paciente formatam pelo relógio da clínica
- [x] "Hoje/amanhã" no app sai do relógio da clínica, não do contêiner
- [x] A fila avisa por push **e** e-mail, sempre
- [x] O e-mail da fila não depende da preferência de canal
- [x] Falhar em avisar uma pessoa não impede a seguinte
- [x] O jest roda no fuso do contêiner

## Provas

`__tests__/agenda/a-fila-de-espera-avisa-pelos-dois.test.ts` — 8 cenários.

**Testados por mutação, duas vezes:**
- Tirando o `timeZone` do `lib/waitlist.ts` com o jest no fuso da máquina: **0
  testes falham** — era o teste passando por acidente.
- Com o jest em UTC: **2 falham**, os dois da hora. É a mutação que prova que a
  régua funciona.

Suíte completa: **2807 testes, 188 suítes, verdes.** `npx tsc --noEmit` em 0 na
web e no mobile. `NEXT_DIST_DIR=.build npm run build`: verde.

## O que fica em aberto

- **Os 4 caminhos internos** com o mesmo defeito: alerta de cancelamento ao
  admin (`app/api/appointments/[id]/route.ts`), `admin/command-chat/actions`,
  `soap-notes/[id]/pdf` e `webhooks/vapi`.
- **QA na tela destes 5 arquivos.** O agente que mediu a T-7 registou o corte:
  ele não mediu nenhum deles. Precisa de uma rodada própria, com o servidor em
  `TZ=UTC`.
- **Nenhum `APPOINTMENT_RESCHEDULED`.** Quando o e-mail de remarcação **é**
  pedido, ele diz *"has been successfully booked"* com a hora nova. O texto do
  SMS/WhatsApp já diz *"has been updated"*; é só o modelo de e-mail que falta.
  Mesma família do texto que mentia na T-1.
- **19 links de e-mail apontam para `/dashboard/*` na web.** Quando o app
  lançar, a área do paciente na web perde acesso — e esses e-mails passam a
  mandar o paciente para uma porta fechada. Levantado ao responder uma pergunta
  do Bruno, não corrigido.
