# T-4: Resumo diário por WhatsApp ao Bruno

**Status:** adiada — a primeira entrega é só e-mail (decisão 1 do plano); volto nesta tarefa depois
**Depende de:** T-3

## Objetivo
O mesmo resumo do e-mail (T-3), também mandado por WhatsApp pro Bruno.

## Contexto
`sendWhatsAppMessage({ to, message })` (`lib/whatsapp.ts`) já existe e é genérico (não amarrado a
paciente) — só falta o número de destino (suposição 4 do plano) e o texto formatado pra WhatsApp
(mais curto que o e-mail, sem HTML).

## Passos
1. No mesmo handler do cron (T-3), depois de montar o resumo do e-mail, montar a versão texto-plano
   (contagens + até ~10 nomes de quem não completou, "e mais N" se passar disso) e chamar
   `sendWhatsAppMessage`.
2. Se `isWhatsAppConfigured()` for falso (não configurado no ambiente), pular silenciosamente essa
   etapa e seguir só com o e-mail — não falhar o cron inteiro por isso.

## Arquivos afetados
- `app/api/cron/daily-adherence/route.ts`

## Critérios de aceite
- [ ] Bruno recebe a mensagem de WhatsApp com a contagem certa (completos/pendentes do dia).
- [ ] Sem WhatsApp configurado, o cron não quebra — só o e-mail sai.
