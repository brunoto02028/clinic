# T-3: Sincronizar status da fatura com o ciclo de aprovação/envio do e-mail

**Status:** concluído
**Depende de:** T-2

## Objetivo

`PatientInvoice.status` reflete o que realmente aconteceu com a fatura,
acompanhando as ações já existentes em `app/api/admin/email/route.ts`
(`approveSend`/`discard`/`permanentDelete`) sem reescrever essa rota.

## Contexto

`app/api/admin/email/route.ts` já é a rota endurecida (isolamento por
clínica, atividades 070/071) — esta tarefa só ACRESCENTA um efeito
colateral pequeno em cada action, não muda a lógica de autorização/escopo
existente.

## Passos

1. Action `approveSend`: depois de marcar o `EmailMessage` como `SENT`, se
   `patientInvoiceId` estiver preenchido, atualizar
   `PatientInvoice.status` pra `SENT` (só se ainda `DRAFT` — não
   sobrescrever um status manual como `PAID`/`VOID` que porventura já
   tenha sido setado antes de um reenvio).
2. Action `discard`: sem efeito no `PatientInvoice` (a fatura continua
   existindo como registro, só aquele e-mail específico foi descartado —
   o admin pode gerar/reenviar outro e-mail pra mesma fatura depois).
3. Action `permanentDelete`: sem efeito no `PatientInvoice` (o
   `patientInvoiceId` fica `SetNull` automaticamente pela FK, conforme
   T-1) — a fatura em si não é apagada.
4. Reenvio de uma fatura já `SENT` (cenário: PDF saiu errado, precisa
   mandar de novo) — decidir e documentar o fluxo esperado (provavelmente:
   gerar um novo `EmailMessage` a partir do mesmo `PatientInvoice`, sem
   duplicar o registro nem o `invoiceNumber`).

## Arquivos afetados

- `app/api/admin/email/route.ts`

## Critérios de aceite

- [ ] Aprovar e enviar uma fatura pendente atualiza `PatientInvoice.status`
      pra `SENT`.
- [ ] Descartar não muda o status da fatura.
- [ ] Um status manual (`PAID`, `VOID`) nunca é sobrescrito de volta pra
      `SENT` por uma ação de e-mail.
- [ ] Nenhuma regressão nos cenários já cobertos pela `qa-spec.md` das
      atividades 070/071 pra essa mesma rota.
