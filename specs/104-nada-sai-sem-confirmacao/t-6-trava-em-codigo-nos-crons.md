# T-6: Trava em código nos quatro crons

**Status:** implementada em 02/10/2026 — QA pendente
**Depende de:** nenhuma

## Objetivo

Tirar a política de dentro do painel do Coolify e colocá-la no código. Hoje
o que protege o paciente é uma caixa desmarcada numa tela externa.

## Contexto

Quatro rotas mandam lembrete ao paciente e **não têm trava nenhuma**:

| rota | linha do envio |
|---|---|
| `app/api/cron/appointment-reminders/route.ts` | 44 |
| `app/api/cron/exercise-reminders/route.ts` | 51 |
| `app/api/cron/bp-reminders/route.ts` | 56 |
| `app/api/cron/onboarding-reminder/route.ts` | 43 |

O único `return` antecipado em cada uma é o 401 do `cronSecret`. O que as
desliga é a *scheduled task* do Coolify estar off desde 17/09/2026 — estado
de infraestrutura, fora do repositório, confirmado em
`specs/072-motor-acompanhamento-paciente/qa/report-t-1.md:107`.

**Religar aquele botão volta a mandar sem mudar uma linha de código.**

O próprio repositório sabe disso. `lib/notify-patient.ts:51-61`:

> "este arquivo é chamado pelos quatro crons de lembrete — os que o Bruno
> mandou desligar em 17/09 (...). Bastaria alguém religar um cron para o
> robô começar a vibrar o celular de paciente."

A decisão foi documentada em comentário em vez de virar código. Comentário
não recusa pedido.

Contraste útil: `daily-adherence` tem três camadas — o split de 17/09
(`route.ts:17-20`), `clinic.dailyRemindersEnabled @default(false)`
(`prisma/schema.prisma:386`), e a fila com aprovação obrigatória. É o
modelo.

`exercise-reminders` é o mais exposto dos quatro: varre **todos** os
protocolos `ACTIVE` com item pendente, sem nenhum filtro de opt-in por
paciente.

## Passos

1. Nas quatro rotas, early return antes de qualquer envio:

   ```ts
   if (process.env.PATIENT_REMINDER_CRONS !== "on") {
     return NextResponse.json({ disabled: true, reason: "patient reminders are off by policy (17/09/2026)" });
   }
   ```

   A variável **não** vai para o Coolify agora. Fica fora, e a rota responde
   `disabled: true` se alguém religar a task por engano.

2. Alternativa melhor, se couber no esforço: as quatro passam a
   **enfileirar** em `OutboundMessage` em vez de enviar, como o
   `daily-adherence`. Aí a task do Coolify pode ficar ligada sem risco, e o
   Bruno aprova em lote. **Decidir com ele** — é mais trabalho e muda o
   produto, não só o interruptor.
3. `bp-reminders` já tem gate por paciente (`bpReminderEnabled: true`).
   Manter; a trava nova é adicional, não substituta.
4. `exercise-reminders`: registrar que falta filtro de opt-in por paciente.
   Não consertar aqui — é escopo da decisão do passo 2.
5. Atualizar o comentário de `lib/notify-patient.ts:51-61` para apontar
   para a trava, em vez de descrever um risco que agora está fechado.

## Arquivos afetados

- `app/api/cron/appointment-reminders/route.ts`
- `app/api/cron/exercise-reminders/route.ts`
- `app/api/cron/bp-reminders/route.ts`
- `app/api/cron/onboarding-reminder/route.ts`
- `lib/notify-patient.ts` (comentário)

## Critérios de aceite

- [ ] Cada uma das quatro rotas, chamada com o `cronSecret` correto e sem
      a variável ligada, responde `disabled: true` e **não manda nada** —
      prova por contagem, uma por rota.
- [ ] Com a variável ligada em ambiente de teste, voltam a funcionar (para
      a trava não virar código morto que ninguém sabe se funciona).
- [ ] O comentário de `lib/notify-patient.ts` descreve a trava real.
- [ ] A decisão do passo 2 está registrada no plano, tomada, não em aberto.
