# T-2: Substituir as 9 duplicações hardcoded

**Status:** pendente
**Depende de:** T-1

## Objetivo
Nenhum arquivo mais decide sozinho pra onde mandar o alerta — todos usam `getAdminNotificationEmail()`.

## Contexto
Arquivos com `process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com'` hardcoded (achados na auditoria):
`lib/email-templates.ts:735`, `lib/notify-patient.ts:143`, `lib/ai-coworker.ts:144`, `app/api/medical-screening/route.ts:160,326`, `app/api/appointments/route.ts:264`, `app/api/body-assessments/capture/[token]/route.ts:34`, `app/api/patient/messages/route.ts:94`, `app/api/patient/questions/route.ts:57`.

Outlier: `app/api/webhooks/vapi/route.ts:225` tem o email fixo no código (`"brunotoaz@gmail.com"`), sem ler nenhuma variável de ambiente — esse precisa da mudança mais direta (de literal fixo pra chamada da função).

## Passos
1. Em cada arquivo listado, trocar a expressão hardcoded por `await getAdminNotificationEmail(clinicId)` (usando o `clinicId` já disponível no escopo de cada rota — a maioria já tem).
2. Onde não há `clinicId` fácil no escopo (verificar caso a caso), chamar sem argumento (usa a config global).
3. Conferir que nenhum comportamento muda pra quem NÃO configurou nada ainda (mesmo resultado de hoje: `ADMIN_EMAIL` ou o fallback hardcoded).

## Arquivos afetados
- `lib/email-templates.ts`
- `lib/notify-patient.ts`
- `lib/ai-coworker.ts`
- `app/api/medical-screening/route.ts`
- `app/api/appointments/route.ts`
- `app/api/body-assessments/capture/[token]/route.ts`
- `app/api/patient/messages/route.ts`
- `app/api/patient/questions/route.ts`
- `app/api/webhooks/vapi/route.ts`

## Critérios de aceite
- [ ] Busca no repo por `brunotoaz@gmail.com` só retorna o fallback dentro de `lib/admin-notify-email.ts` (nenhuma outra duplicação sobrando).
- [ ] Um teste local de cada fluxo tocado (ou pelo menos os mais críticos: triagem, agendamento) confirma que o email ainda chega no destino certo.
