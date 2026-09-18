# T-4: Toggle em `/admin/clinics` pra ligar/desligar por tenant

**Status:** concluído
**Depende de:** T-1

## Objetivo
O Bruno (SUPERADMIN) consegue ligar/desligar `instagramImportEnabled` por clínica direto na tela de gestão de clínicas, sem precisar mexer no banco na mão.

## Contexto
`app/admin/clinics/page.tsx` hoje não tem nenhum formulário de edição de configurações por clínica — o item de menu "Clinic Settings" existe mas está sem `onClick` (stub). A API `app/api/admin/clinics/[id]/route.ts` (PATCH, já protegida por SUPERADMIN) já aceita qualquer campo do `Clinic` via passthrough (`data: body`), então não precisa mudar a API.

## Passos
1. Criar um diálogo de edição simples (reaproveitando os componentes de UI já usados no diálogo de criação da mesma página) acionado pelo item de menu "Clinic Settings" (ligar o `onClick` que hoje não existe).
2. Dentro do diálogo: um toggle/checkbox "Instagram Import" com a descrição curta do que ele libera (baixar vídeos de posts/perfis do Instagram pra biblioteca de exercícios) e um aviso de que é uma feature sensível a direitos autorais — usar como copy algo como "Só ligue se você confia no uso que esse tenant vai fazer disso".
3. `onSave`: `PATCH /api/admin/clinics/[id]` com `{ instagramImportEnabled: boolean }`.
4. Atualizar a lista/linha da clínica localmente após salvar (sem precisar recarregar a página).

## Arquivos afetados
- `app/admin/clinics/page.tsx`

## Critérios de aceite
- [ ] SUPERADMIN consegue abrir o diálogo de configurações de uma clínica pela lista.
- [ ] Ligar o toggle e salvar reflete no banco (`instagramImportEnabled = true`).
- [ ] Desligar o toggle e salvar reflete no banco (`instagramImportEnabled = false`).
- [ ] Um usuário não-SUPERADMIN não consegue acessar essa tela/ação (checagem já existe na página/API, só confirmar que não regride).
