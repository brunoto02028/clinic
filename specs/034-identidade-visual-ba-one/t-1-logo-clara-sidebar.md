# T-1: Logo clara no sidebar admin

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Corrigir a logo ilegível no sidebar escuro do admin.

## Contexto
`components/admin/admin-mini-sidebar.tsx` renderiza `<Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" showText={true} linkTo="/admin" />` sem `variant`. Em `components/ui/logo.tsx`, o default `variant="auto"` alterna light/dark via CSS `dark:` do Tailwind — que nunca está ativo neste app (não tem `ThemeProvider` montado). Resultado: sempre renderiza `logoUrl` (clara) crua no fundo escuro do sidebar (`background: hsl(200 40% 5%)`), ou cai no fallback de texto "BPR" se não houver `logoUrl`. `admin-login-form.tsx`/`site-footer.tsx` já contornam isso com `variant="dark"`.

## Passos
1. `components/admin/admin-mini-sidebar.tsx`: adicionar `variant="dark"` na chamada de `<Logo>`.
2. Confirmar em Configurações do admin (`SiteSettings.darkLogoUrl` ou `screenLogos.adminSidebar.darkLogoUrl`) se já existe uma logo branca cadastrada. **Se não existir, pedir pro Bruno subir o arquivo** — o código sozinho não resolve isso, só usa o que estiver cadastrado.

## Arquivos afetados
- `components/admin/admin-mini-sidebar.tsx`

## Critérios de aceite
- [ ] `variant="dark"` aplicado.
- [ ] Com uma logo branca cadastrada em `darkLogoUrl`, ela aparece legível no sidebar escuro.
- [ ] Sem logo branca cadastrada, cai no fallback de texto (comportamento already existente, não piora nada) — registrado como pendência de conteúdo, não de código.
