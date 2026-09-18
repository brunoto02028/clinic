# T-1: Template do e-mail de boas-vindas do estúdio (EN/PT)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Uma função pura `studioWelcomeEmail({ studioName, slug, firstName, email, tempPassword, isPt, appUrl })` que devolve `{ subject, html, from }`.

## Contexto
Ver as decisões no plan.md. Os valores vindos do tenant (nome do estúdio, primeiro nome) são escapados no HTML. HTML de e-mail em tabelas e com estilos inline, no mesmo padrão dos outros e-mails.

## Passos
1. Criar `lib/studio-welcome-email.ts` com os textos EN e PT.
2. Montar o remetente `"<Estúdio> via BPR" <noreply@bpr.clinic>` com o nome sanitizado, sem aspas nem `<>`.
3. Gerar uma prévia local para conferir o visual, em EN e em PT.

## Arquivos afetados
- `lib/studio-welcome-email.ts` (novo)

## Critérios de aceite
- [ ] O assunto, o corpo e o remetente citam o estúdio e nunca "Bruno Physical Rehabilitation" nem "Welcome to the Team".
- [ ] O e-mail traz o login, a senha temporária, o botão para `/staff-login`, o link `/join/<slug>` e os 4 primeiros passos.
- [ ] Um nome de estúdio com `<script>` ou aspas sai escapado.
- [ ] Os textos EN e PT estão completos, sem mistura de idiomas.
