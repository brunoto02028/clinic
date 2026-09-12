# T-3: Campo editável em `/admin/settings`

**Status:** pendente
**Depende de:** T-1

## Objetivo
O Bruno troca o email de notificação sozinho, sem precisar de mim nem de acesso ao Coolify.

## Contexto
`/admin/settings` já edita campos simples de `SiteSettings` (ex. `phone`) com o mesmo padrão: um `Input` controlado, salvo via `PATCH`/`PUT` em `/api/settings`. Seguir exatamente esse padrão.

## Passos
1. `app/admin/settings/page.tsx`: adicionar um campo "Notification email" perto do campo de telefone/contato existente, com uma descrição curta ("Onde os alertas de novo paciente, triagem, pressão alta etc. chegam — diferente do email de contato público do site").
2. `app/api/settings/route.ts`: aceitar e persistir `notificationEmail` no PATCH/PUT, mesmo padrão do `phone`.

## Arquivos afetados
- `app/admin/settings/page.tsx`
- `app/api/settings/route.ts`

## Critérios de aceite
- [ ] Campo aparece na tela, com o valor atual carregado.
- [ ] Salvar um novo valor persiste no banco.
- [ ] Deixar em branco volta a usar os fallbacks (não quebra nada).
