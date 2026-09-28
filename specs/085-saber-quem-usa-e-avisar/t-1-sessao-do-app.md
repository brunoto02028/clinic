# T-1: Sessão do app — modelo, sinal e fechamento

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Responder "quanto tempo essa pessoa usa o app" sem guardar cada toque.

## Contexto

Decisão 5 do plano: uma sessão tem começo, último sinal e fim. Contar eventos geraria uma tabela
enorme para uma pergunta simples.

## Passos

1. `prisma/schema.prisma` — aditivo: `AppSession { id, userId, clinicId?, startedAt, lastSeenAt,
   endedAt?, platform, appVersion, city?, country? }`, índices por `userId` e `lastSeenAt`.
2. `POST /api/mobile/session/ping` — abre a sessão na primeira chamada e atualiza `lastSeenAt` nas
   seguintes. Tenant e pessoa pelo actor mobile, nunca pelo corpo.
3. No app: sinal na abertura e a cada 3 minutos **em primeiro plano** (`AppState`). Em segundo
   plano, nada — bateria é do paciente.
4. Fechamento por silêncio: uma sessão sem sinal há 30 minutos tem `endedAt = lastSeenAt`. Feito na
   leitura, não por cron — os crons de lembrete estão desligados e este não precisa existir.
5. `duracaoDaSessao()` e `tempoDeUsoNoPeriodo(userId, de, ate)` em `lib/app-usage.ts`.

## Arquivos afetados

- `prisma/schema.prisma`, `lib/app-usage.ts` (novo)
- `app/api/mobile/session/ping/route.ts` (novo)
- `mobile/src/lib/session-ping.ts` (novo), `mobile/app/(app)/_layout.tsx`
- `__tests__/usage/session.test.ts` (novo)

## Critérios de aceite

- [ ] Dois sinais em 3 minutos = **uma** sessão, não duas
- [ ] Sinal depois de 40 minutos de silêncio = sessão nova, e a anterior fechada em `lastSeenAt`
- [ ] Sessão de outro tenant nunca aparece na contagem de uma clínica
- [ ] O app não manda sinal em segundo plano
- [ ] Sem rede, o sinal falha em silêncio e não trava tela nenhuma
- [ ] `prisma migrate diff` contra o `main`: zero DROPs
