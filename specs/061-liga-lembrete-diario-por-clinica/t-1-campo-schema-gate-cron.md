# T-1: Campo no schema + gate no cron

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O cron `daily-adherence` só manda lembrete pra clínicas que optaram por isso.

## Passos
1. `prisma/schema.prisma`, `model Clinic`: acrescentar
   `dailyRemindersEnabled Boolean @default(false)`.
2. `npx prisma db push` local; depois de aprovado, produção (mesmo padrão já usado nesta sessão —
   buscar `DATABASE_URL` de prod via API do Coolify pra uma variável não impressa).
3. Em `app/api/cron/daily-adherence/route.ts`, linha 30
   (`prisma.clinic.findMany({ where: { isActive: true }, ... })`): acrescentar
   `dailyRemindersEnabled: true` ao `where`. Resto da rota (loop por paciente, dedupe por
   `AuditLog`, `notifyPatient`) fica exatamente igual.

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/cron/daily-adherence/route.ts`

## Critérios de aceite
- [ ] Clínica com `dailyRemindersEnabled: false` (padrão) → `POST /api/cron/daily-adherence` não
      processa nem manda nada pra nenhum paciente dela.
- [ ] Clínica com `dailyRemindersEnabled: true` e paciente com item pendente hoje → recebe o
      lembrete, `AuditLog` `DAILY_ADHERENCE_REMINDER_SENT` criado, igual ao envio manual de hoje.
- [ ] O botão manual "Send now" (`send-reminder`) continua funcionando pra qualquer paciente,
      **mesmo numa clínica com o toggle desligado** — o gate é só pro cron, nunca pro envio manual.
- [ ] `npx tsc --noEmit` limpo.
