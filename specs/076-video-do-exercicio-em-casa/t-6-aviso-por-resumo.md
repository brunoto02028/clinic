# T-6: Aviso por resumo diário, não por evento

**Status:** pendente
**Depende de:** T-2

## Objetivo
A clínica fica sabendo do que chegou, sem enxurrada de e-mail.

## Contexto
Palavras do Bruno: *"não precisa ficar mandando um monte de e-mail cheio de notificação"*. E ele
está certo — um e-mail por evento treina a pessoa a ignorar e-mails.

O que já existe: `/api/admin/pending-count`, que alimenta o badge do menu. O que falta é o
resumo.

**A regra que faz isto ser profissional:** o resumo cobra só o que **continua** esperando. O que
já foi visto nunca é cobrado de novo, e não sai e-mail quando não há nada — uma caixa que só
recebe e-mail quando há trabalho é uma caixa que se abre.

## Passos
1. `GET /api/cron/clinic-digest`, autenticada por chave como os outros crons.
2. Juntar o que espera: envios de exercício não revisados, mensagens não lidas, medições órfãs,
   perguntas respondidas, pacientes pendentes.
3. **Nada esperando → não envia.**
4. Um e-mail por clínica, com as contagens e um link por seção. Sem detalhe clínico no corpo —
   o e-mail diz que há o que ver, não o que é.
5. Agendar no Coolify, uma vez por dia (suposição 1).
6. Registrar o envio para não repetir se o cron rodar duas vezes.

## Arquivos afetados
- `app/api/cron/clinic-digest/route.ts` (novo)
- `lib/clinic-digest.ts` (novo)
- `lib/email-templates.ts`, `lib/email-i18n.ts`

## Critérios de aceite
- [ ] Nada pendente → nenhum e-mail
- [ ] O e-mail não contém dado clínico, só contagens e links
- [ ] Rodar duas vezes no mesmo dia não manda dois e-mails
- [ ] Cada clínica recebe só o que é dela
- [ ] Item já visto não aparece no resumo seguinte
- [ ] Falha de e-mail não derruba o cron
