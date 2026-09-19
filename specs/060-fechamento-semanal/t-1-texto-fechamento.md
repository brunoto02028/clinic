# T-1: Texto do fechamento semanal (lib)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Função pura que monta o texto da mensagem (EN e PT), reaproveitável pela rota de envio e pelo
preview.

## Contexto
Texto já aprovado pelo Bruno nesta conversa, com o primeiro nome interpolado na saudação:

EN:
```
Hi {firstName}! Weekly check-in on your rehab plan.

A few items on your plan haven't been marked as done in the system yet. If you've already done
any of these exercises/self-care, please open the app and mark them as complete — this is
important so I can track your progress correctly.

If something genuinely wasn't possible this week, let me know briefly here in Messages why —
pain, lack of time, unsure how to do it, etc. That helps me adjust the plan if needed.

Any questions, I'm here!
```

PT:
```
Olá {firstName}! Fechamento da semana do seu plano de reabilitação.

Notei que alguns itens ainda não foram marcados como feitos no sistema. Se você já fez algum
desses exercícios/cuidados, entra no app e marca como concluído — isso é essencial pra eu
acompanhar sua evolução corretamente.

Se algum item realmente não foi possível fazer, me conta rapidinho por aqui (em Mensagens) o
motivo — dor, falta de tempo, dúvida em como fazer, etc. Isso me ajuda a ajustar o plano se
precisar.

Qualquer dúvida, estou à disposição!
```

## Passos
1. Criar `lib/weekly-closing.ts`:
   - `WEEKLY_CLOSING_TITLE_EN = "Weekly Check-in"`, `WEEKLY_CLOSING_TITLE_PT = "Fechamento da Semana"`
     (usado como `title` do `ClinicMessage` — dá pra identificar essas mensagens depois).
   - `WEEKLY_CLOSING_ACTION_EN = "WEEKLY_CLOSING_SENT_EN"`, `WEEKLY_CLOSING_ACTION_PT = "WEEKLY_CLOSING_SENT_PT"`
     (constantes de `AuditLog.action`, mesmo padrão de `REMINDER_ACTION` em `daily-adherence-email.ts`).
   - `buildWeeklyClosingText(firstName: string, locale: "en" | "pt"): string` — retorna o texto
     acima com `{firstName}` substituído.
   - `startOfWeek(date: Date): Date` — segunda-feira 00:00 (hora local do servidor), mesmo
     padrão de `startOfDay` em `lib/patient-daily-adherence.ts`.

## Arquivos afetados
- `lib/weekly-closing.ts` (novo)

## Critérios de aceite
- [ ] `buildWeeklyClosingText("Ana Livia", "en")` retorna o texto EN com o nome certo.
- [ ] `buildWeeklyClosingText("Ana Livia", "pt")` retorna o texto PT com o nome certo.
- [ ] `startOfWeek` de uma quinta-feira volta pra segunda da mesma semana; de uma segunda,
      retorna ela mesma; de um domingo, volta pra segunda anterior (não avança pra próxima).
- [ ] `npx tsc --noEmit` limpo.
