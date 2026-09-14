# T-3: API — ações approveSend e discard

**Status:** concluído
**Depende de:** T-1

## Objetivo
Permitir que o admin aprove (envia de verdade) ou descarte um item `PENDING_APPROVAL`.

## Contexto
Ver plan.md, decisão 5. Reaproveita a rota `POST /api/admin/email` (mesmo padrão de
`action: "send"` já existente nesse arquivo).

## Passos
1. Em `app/api/admin/email/route.ts`, adicionar `action === "approveSend"`:
   - Carrega o `EmailMessage` pelo `id` do body.
   - 404 se não existir ou não estiver em `PENDING_APPROVAL`.
   - Decodifica `attachmentsJson`, chama `sendEmail()` com `to/subject/html/attachments`.
   - Se `sendEmail` falhar (`success:false`), retorna erro — NÃO move o item, fica pendente
     pra tentar de novo.
   - Se der certo: atualiza `folder: SENT`, `sentAt: now()`, `messageId` (campo `id` do
     retorno do Resend, mesmo fix de nome de campo já aplicado nesta sessão).
2. Adicionar `action === "discard"`:
   - Carrega o `EmailMessage`, move `folder: TRASH`. Sem chamar `sendEmail`.

## Arquivos afetados
- `app/api/admin/email/route.ts`

## Critérios de aceite
- [ ] `approveSend` num item pendente de teste realmente dispara o email (verificar no
      `emailMessage` que virou `SENT` com `messageId` real do Resend)
- [ ] `approveSend` num item já `SENT` ou inexistente retorna erro, não reenvia
- [ ] `discard` move pra `TRASH` sem chamar `sendEmail`
- [ ] `npx tsc --noEmit` limpo
