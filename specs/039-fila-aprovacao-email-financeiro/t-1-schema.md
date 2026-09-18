# T-1: Schema — enum PENDING_APPROVAL + campo attachmentsJson

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Preparar o `EmailMessage` para guardar itens financeiros pendentes de aprovação com o(s)
anexo(s) congelado(s).

## Contexto
Ver plan.md, decisões 2 e 3. `EmailFolder` hoje é `INBOX | SENT | DRAFT | SPAM | TRASH`.

## Passos
1. Adicionar `PENDING_APPROVAL` ao enum `EmailFolder` em `prisma/schema.prisma`.
2. Adicionar `attachmentsJson String? @db.Text` ao model `EmailMessage`.
3. Rodar `npx prisma generate` e `npx prisma db push` no banco local (dev).
4. Confirmar que a rota existente `/api/admin/email?folder=SENT` etc. continua funcionando
   sem alterações (o enum novo não deve quebrar nada existente).

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] `npx tsc --noEmit` limpo
- [ ] `npx prisma generate` sem erro
- [ ] Local: criar um `EmailMessage` de teste com `folder: PENDING_APPROVAL` e
      `attachmentsJson` preenchido via Prisma Studio ou script, e ler de volta.
