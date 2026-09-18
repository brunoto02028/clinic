# T-2: Gate no backend + expor o flag na sessão

**Status:** concluído
**Depende de:** T-1

## Objetivo
O endpoint de import passa a recusar (403) qualquer request de uma clínica sem o flag ligado, independente do role. O flag também fica disponível no client pelo mesmo caminho que `clinicType`/`isPersonal` já usam.

## Contexto
`lib/auth-options.ts`: o `jwt` callback já busca `clinic: { select: { ..., type: true, ... } }` tanto no login por credenciais quanto no login Google, e copia campos pra `token.*`; o `session` callback copia `token.*` pra `session.user`. Adicionar `instagramImportEnabled` nesse mesmo fluxo (select + token + session), do mesmo jeito que `clinicType` já funciona — sem endpoint novo, sem fetch extra.

## Passos
1. `lib/auth-options.ts`: incluir `instagramImportEnabled: true` no `select` da relação `clinic` (nos dois pontos: login por credenciais e login Google), copiar pro `token.instagramImportEnabled` e depois pro `session.user.instagramImportEnabled` (mesmo padrão de `clinicType`).
2. `app/api/admin/exercises/instagram/route.ts`: depois do check de role atual (`["ADMIN","SUPERADMIN","THERAPIST"]`), buscar `prisma.clinic.findUnique({ where: { id: clinicId }, select: { instagramImportEnabled: true } })` e, se `false`, devolver 403 com uma mensagem clara (ex. "Instagram import não está habilitado pra essa clínica — peça pro administrador da plataforma"). Checagem no servidor, não confia só no flag da sessão (sessão pode estar desatualizada).
3. `hooks/use-vocab.ts` (ou um hook/local novo, ver T-3): garantir que o novo campo da sessão fica acessível igual a `isPersonal` hoje.

## Arquivos afetados
- `lib/auth-options.ts`
- `app/api/admin/exercises/instagram/route.ts`

## Critérios de aceite
- [ ] Request de import de uma clínica com `instagramImportEnabled = false` retorna 403 com mensagem clara, mesmo sendo ADMIN/SUPERADMIN.
- [ ] Request de uma clínica com `instagramImportEnabled = true` continua funcionando normalmente.
- [ ] `session.user.instagramImportEnabled` reflete o valor do banco depois do login.
