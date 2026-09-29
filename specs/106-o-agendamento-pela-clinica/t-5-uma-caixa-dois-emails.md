# T-5: Uma caixa marcada, dois e-mails enviados

**Status:** 🟢 concluída (29/09) — aguardando QA
**Depende de:** T-1 (feita)

## Objetivo

Que a caixa envie o que ela diz que envia, e nada além.

## Contexto — achado do QA da T-1

O QA mediu o envio no destino e encontrou o que eu não tinha procurado: marcar
*"Send the confirmation email now"* dispara **dois** e-mails ao paciente.

1. A confirmação da consulta — a que a caixa promete.
2. Um aviso de **triagem médica**, quando o paciente ainda não preencheu a
   ficha. Assunto: *"⚠️ Action Required: Complete your medical screening before
   your appointment"*.

O segundo é montado em HTML dentro da própria rota
(`app/api/admin/appointments/route.ts`), **sem passar por prévia nenhuma**.

## Por que isto importa nesta casa

A regra de 29/09/2026: nada sai para paciente sem o Bruno ver a prévia e sem o
logo da BPR. A T-1 consertou o texto que mentia sobre o envio automático — e
atrás dele havia um segundo envio que ninguém vê antes de sair.

Não é vazamento e não é urgente: o e-mail é legítimo, vai para o paciente certo,
e só sai quando alguém marca a caixa. O que ele não é: **previsto por quem
marcou a caixa**.

## Por que está parada

Três saídas, e a escolha é de produto:

| | o que seria |
|---|---|
| **(a)** | a caixa passa a dizer o que faz — *"enviar a confirmação (e o aviso de triagem, se faltar)"* |
| **(b)** | o aviso de triagem ganha caixa própria, e some da caixa da confirmação |
| **(c)** | o aviso de triagem vira mais um modelo do compositor com prévia, como todos os outros |

A **(c)** é a que segue a regra da casa; a **(a)** é a de uma linha.

## A resposta do Bruno, 29/09/2026

> *"Ao agendar uma consulta ou dias de tratamento de um determinado paciente, só
> será enviado notificação depois que alguém da clinic liberar. Aí vamos enviar
> por email e a notificação do app para o paciente ver a agenda dele."*

Ele não escolheu entre (a), (b) e (c) — respondeu a regra, que é melhor. Duas
metades:

1. **Nada sai sozinho.** Já estava de pé desde a T-1.
2. **Liberar manda e-mail _e_ a notificação do aplicativo.** Faltava: liberar
   mandava só o e-mail, e o telefone ficava mudo.

## O que foi feito

- `pushConsulta(patientId, "marcada")` **dentro** do bloco que já depende do
  pedido explícito. Não pode ter porta própria, senão volta a existir envio que
  ninguém pediu.
- **Não** foi para dentro de `notifyPatient`, e isso é deliberado: o docstring
  daquele arquivo conta que ele é chamado pelos crons de lembrete, e um push ali
  começaria a vibrar telefone de paciente assim que alguém religasse um cron.
- Falha de push não derruba a criação: um telefone sem token não pode impedir
  alguém de marcar.
- A caixa passou a **anunciar os três envios** — confirmação, notificação, e o
  aviso de triagem quando a ficha ainda falta. Era o achado original: ela dizia
  "o e-mail de confirmação" e mandava dois e-mails.

## Critérios de aceite
- [x] O Bruno respondeu — com a regra, não com a opção.
- [x] Nada sai ao paciente sem estar escrito na tela que vai sair.
- [x] Liberar manda e-mail **e** notificação do aplicativo.
- [x] O push não tem porta própria, e não entrou em `notifyPatient`.
- [ ] QA: contar quantos e-mails e quantos pushes saem em cada combinação.
