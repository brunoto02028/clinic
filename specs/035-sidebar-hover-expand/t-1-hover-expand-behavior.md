# T-1: Comportamento hover-expand no admin-mini-sidebar.tsx

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Fazer o `<nav>` do admin-mini-sidebar alternar entre colapsado (68px, só ícones) e expandido (220px, ícones + labels) ao passar o mouse, só no desktop (`lg:` e acima).

## Contexto
Ver decisões de design no `plan.md`. Trigger é `onMouseEnter`/`onMouseLeave` no `<nav>` inteiro. Sem tooltip por item. Mobile continua com o drawer atual (`mobile-open` class), sem nenhuma mudança de comportamento.

## Passos
1. Adicionar estado `expanded` (`useState`) no componente, iniciando `false`.
2. `onMouseEnter` no `<nav>` → `setExpanded(true)`; `onMouseLeave` → `setExpanded(false)` com um pequeno delay (~150ms, via `setTimeout` + cleanup) pra evitar fechar em passagens rápidas do mouse.
3. Aplicar a largura condicionalmente: `width: expanded ? 220 : 68` no `style` inline do `<nav>` (ou trocar pra classes utilitárias com `transition-[width]`), com `transition: width 0.2s ease`.
4. Esconder os labels de texto (`<span className="flex-1">{...}</span>` dos itens de nav, o texto do usuário/rodapé, e o texto do logo) quando `!expanded` — usar `opacity`/`width:0`/`overflow:hidden` em vez de `display:none` pra permitir transição suave, e não quebrar a transição do container.
5. `Logo`: passar `showText={expanded}`.
6. Badge de "pending patients" (contador vermelho): continuar visível mesmo colapsado (ícone + badge só, sem o label).
7. `ClinicSelector` e `LocaleToggle` do rodapé: quando colapsado, ocultar ou reduzir pra não vazar layout (decisão de implementação: pode escondê-los quando colapsado e só mostrar expandido, já que dependem de espaço horizontal para o próprio conteúdo — não são só ícone).
8. Restringir o hover-expand ao desktop: envolver a lógica de largura/mouse handlers de forma que no mobile (`max-width: 1023px`, onde o CSS já força `transform: translateX(-100%)`/`translateX(0)` fixo em 220px via `.admin-mini-sidebar`/`.mobile-open`) o comportamento de largura dinâmica não interfira — o CSS mobile já sobrescreve via media query, então basta garantir que a largura inline não conflite (usar a mesma abordagem: media query no CSS tem precedência, ou aplicar a lógica de width só quando `window.innerWidth >= 1024` / via CSS puro com `@media (min-width: 1024px)`).

## Arquivos afetados
- `components/admin/admin-mini-sidebar.tsx`

## Critérios de aceite
- [ ] No desktop, o menu abre colapsado (68px, só ícones) por padrão.
- [ ] Passar o mouse sobre o menu expande suavemente para 220px, revelando os labels.
- [ ] Tirar o mouse do menu recolhe de volta após um pequeno delay (não fecha instantaneamente/nem trava aberto).
- [ ] O item ativo continua destacado (ícone + barra lateral) mesmo colapsado.
- [ ] No mobile/tablet, o comportamento do drawer (hambúrguer) continua idêntico ao atual — sem hover, sem rail colapsado.
