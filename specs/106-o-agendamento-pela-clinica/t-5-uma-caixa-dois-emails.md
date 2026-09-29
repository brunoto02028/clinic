# T-5: Uma caixa marcada, dois e-mails enviados

**Status:** pendente — espera o Bruno
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

## Critérios de aceite
- [ ] O Bruno escolheu.
- [ ] Nada sai ao paciente sem estar escrito na tela que vai sair.
- [ ] Teste que prova quantos e-mails saem em cada combinação.
