# T-2: Rota do invoice cria pendente em vez de enviar

**Status:** concluído
**Depende de:** T-1

## Objetivo
`POST /api/admin/appointments/[id]/invoice` para de chamar `sendEmail()` direto — passa a
criar um `EmailMessage` pendente.

## Contexto
Ver plan.md, decisão 4. A rota hoje (depois do fix de log/verificação desta sessão) monta o
HTML do invoice, chama `sendEmail()`, verifica o resultado e loga em `EmailMessage` como
`SENT`. Isso muda pra: montar o mesmo HTML, e em vez de enviar, criar o `EmailMessage` como
`PENDING_APPROVAL`, com o corpo da mensagem em `htmlBody` e o HTML do invoice em
`attachmentsJson` (mesmo formato de anexo já usado: `[{filename, contentBase64}]`).

A rota `GET` (prévia HTML direta) não muda.

## Passos
1. Em `app/api/admin/appointments/[id]/invoice/route.ts`, no `POST`: remover a chamada a
   `sendEmail()`. Montar `attachmentsJson` com o HTML do invoice em base64.
2. Criar o `EmailMessage` com `folder: PENDING_APPROVAL`, `direction: OUTBOUND`,
   `templateSlug: "INVOICE"`, `patientId`, `toAddress`, `subject`, `htmlBody` (corpo da
   mensagem, não o invoice em si), `attachmentsJson`.
3. Resposta da rota passa a ser `{ success: true, pendingId, invoiceNumber }` (sem mandar
   nada ainda).

## Arquivos afetados
- `app/api/admin/appointments/[id]/invoice/route.ts`

## Critérios de aceite
- [ ] Chamar o `POST` não dispara nenhum email real (checar logs do Resend / nenhum novo
      `SENT` aparece em `/api/admin/email?folder=SENT`)
- [ ] Um novo item aparece em `/api/admin/email?folder=PENDING_APPROVAL` com o conteúdo certo
- [ ] `npx tsc --noEmit` limpo
