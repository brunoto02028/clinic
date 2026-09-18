# T-3: Esconder o botão "Instagram" quando desligado

**Status:** concluído
**Depende de:** T-2

## Objetivo
Um tenant sem o flag ligado não vê o botão "Instagram" na biblioteca de exercícios — evita o usuário bater num 403 sem entender por quê.

## Contexto
`app/admin/exercises/page.tsx` renderiza o botão "Instagram" (dentro do `Dialog` `showInstagram`) sem nenhuma condição hoje. `useSession()` já expõe `session.user.instagramImportEnabled` depois da T-2.

## Passos
1. Ler `session.user.instagramImportEnabled` (via `useSession()`, mesmo padrão de `useVocab()`/`isPersonal`) no componente da página de exercícios.
2. Envolver o botão "Instagram" (e o `Dialog` inteiro de import) numa condicional — só renderiza se `instagramImportEnabled` for `true`.
3. Não precisa de mensagem de "recurso bloqueado" — só não aparece, igual o padrão já usado pra esconder abas `clinicalOnly`/`personalOnly` no `admin-mini-sidebar`.

## Arquivos afetados
- `app/admin/exercises/page.tsx`

## Critérios de aceite
- [ ] Personal trainer sem o flag: botão "Instagram" não aparece na biblioteca de exercícios.
- [ ] Clínica com o flag (`CLINIC`, pós-migração): botão aparece normalmente, comportamento idêntico ao de hoje.
- [ ] Personal trainer com o flag ligado manualmente (via T-4): botão aparece.
