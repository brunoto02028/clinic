# T-1: Campo `notificationEmail` + função central `getAdminNotificationEmail`

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Ter um único lugar que resolve "pra qual email mandar um alerta de admin", em vez das 9 duplicações hardcoded encontradas na auditoria.

## Contexto
`SiteSettings` já é por-clínica (`clinicId String? @unique`) e já tem um campo `email` (contato público). O novo campo é um email *diferente*, especificamente pra alertas internos — não deve virar o mesmo texto que aparece no site público.

## Passos
1. `prisma/schema.prisma`: adicionar `notificationEmail String?` no model `SiteSettings`, com comentário explicando a diferença do campo `email` (contato público) já existente.
2. Criar `lib/admin-notify-email.ts` com `getAdminNotificationEmail(clinicId?: string): Promise<string>`, resolvendo na ordem: `SiteSettings.notificationEmail` (da clínica, se `clinicId` informado, senão a global) → `SiteSettings.email` → `process.env.ADMIN_EMAIL` → `'brunotoaz@gmail.com'` hardcoded.
3. Rodar `db push` local + `prisma generate` e confirmar que o campo novo aparece no client.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/admin-notify-email.ts` (novo)

## Critérios de aceite
- [ ] `db push` roda sem erro.
- [ ] `getAdminNotificationEmail()` sem `SiteSettings.notificationEmail` nem `.email` configurados retorna `ADMIN_EMAIL`/fallback corretamente (testado com um script local).
- [ ] Com `notificationEmail` configurado, retorna ele, ignorando os outros níveis.
