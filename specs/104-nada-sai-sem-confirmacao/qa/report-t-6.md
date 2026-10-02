# QA — T-6: Trava em código nos quatro crons

**Veredito:** ✅ aprovado
**Data:** 02/10/2026 · **Método:** teste + mutação + varredura dos crons.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 31 | chave certa, política desligada → `disabled: true`, nada sai | ✅ nas 4 |
| 32 | política ligada → volta a funcionar | ✅ nas 4 |
| 33 | chave errada → 401, **antes** de qualquer outra coisa | ✅ nas 4 |
| 34 | o comentário de `lib/notify-patient.ts` descreve a trava real | ⚠️ ver abaixo |

```
$ npx jest __tests__/notifications/os-crons-de-lembrete-recusam-sozinhos.test.ts
Tests:       12 passed, 12 total
```

O cenário 32 é o que impede a trava de virar código morto: sem ele, apagar
o corpo inteiro da rota deixaria tudo verde e a recusa passaria a ser a
única coisa que funciona.

A ordem importa e foi conferida: o 401 do `cronSecret` vem **primeiro**, a
trava depois. Invertido, um pedido sem chave receberia `disabled: true` e
descobriria o estado da política sem se autenticar.

## Mutação

| mutação | testes que caem |
|---|---|
| a trava do cron deixa de existir | **1** |

## Varredura: nenhum outro cron ficou de fora

`app/api/cron/**` tem um único outro arquivo que chama `sendEmail`:
`daily-report/route.ts`. Ele manda para `getAdminNotificationEmail(clinic.id)`
— **a caixa da clínica, não o paciente** — e o comentário no topo explica
que foi separado do `daily-adherence` em 17/09 exatamente para poder ficar
no automático. Correto deixá-lo fora.

`daily-adherence` não foi tocado e mantém as três camadas que já tinha: o
split de 17/09, `clinic.dailyRemindersEnabled @default(false)`, e a fila com
aprovação humana.

O `wearables-probe`, criado por outra frente durante este trabalho, foi
conferido: nem ele nem `lib/withings-sondagem.ts` chamam envio. É leitura
de dados.

## Ressalva

O comentário de `lib/notify-patient.ts:61-72` continua descrevendo o risco
("bastaria alguém religar um cron") como se estivesse aberto. Com a trava
no lugar, ele agora **superestima** o perigo. Vale reescrever — é a última
alínea do passo 5 da tarefa e não foi feita.

## O que este QA não cobre

1. **O estado real da tarefa agendada no Coolify.** Continua desmarcada,
   mas isso é infraestrutura externa e não se verifica no repositório. A
   diferença é que agora não importa.
2. **Nenhuma chamada real a `/api/cron/*` em produção.**
3. Que `PATIENT_REMINDER_CRONS=on` em produção realmente religa — provado
   só em ambiente de teste.
