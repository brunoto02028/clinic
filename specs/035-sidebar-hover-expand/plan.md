# Atividade 35 — Menu lateral do admin com hover-to-expand (estilo Everfit)

## Objetivo
Hoje o `admin-mini-sidebar` é fixo em 220px (com labels de texto sempre visíveis) no desktop, e vira um drawer off-canvas no mobile/tablet. A Everfit usa um **rail de ícones colapsado por padrão** (~68px) que expande suavemente ao passar o mouse, revelando os labels — sem empurrar o conteúdo da página (overlay). Vamos replicar esse comportamento no desktop, mantendo o drawer mobile como está (não faz sentido "hover" em touch).

## Decisões de design
- **Trigger:** `onMouseEnter`/`onMouseLeave` no `<nav>` inteiro (não por item) — hover em qualquer lugar do rail expande o menu todo, igual à Everfit.
- **Overlay, não reflow:** o conteúdo da página (`.admin-content-area`) mantém `margin-left` fixo na largura **colapsada** (68px) o tempo todo. O menu expandido fica por cima do conteúdo (`position: fixed` + `z-index`, já é assim hoje) com uma sombra pra separar visualmente. Isso evita o conteúdo "pular" a cada hover.
- **Estado colapsado:** só ícones, com o item ativo ainda destacado (barra lateral + fundo), sem texto. Sem tooltip individual por item — como o hover expande o menu inteiro, o tooltip seria redundante.
- **Logo:** colapsado mostra só o ícone/símbolo (sem o texto do nome); expandido mostra o logo completo (já existe a prop `showText` no componente `Logo`).
- **Rodapé (Settings, seletor de idioma, avatar do usuário):** mesmo tratamento — ícone só quando colapsado, expande junto com o resto no hover.
- **Transição:** `width` + `transform`/`opacity` dos labels em ~150-200ms ease, sem delay no enter; um pequeno delay (~150ms) no leave pra evitar fechar sozinho ao passar o mouse rápido por cima.
- **Mobile/tablet (`max-width: 1023px`):** comportamento inalterado — continua drawer off-canvas acionado pelo botão hambúrguer, sem hover (não existe hover em touch).
- **Sem "pin" manual:** não foi pedido um botão pra fixar expandido; fica só hover, como a referência.

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Comportamento hover-expand no `admin-mini-sidebar.tsx` | concluído |
| T-2 | Margem do conteúdo fixa no colapsado + polish visual (sombra, z-index, estado ativo colapsado) | concluído |
| T-3 | QA visual consolidada (desktop expandido/colapsado, mobile inalterado, personal x clínica) | concluído |

## Suposições
1. **Largura colapsada = 68px** (ícone 18px + padding atual do item, ~equivalente ao rail da Everfit). Se ficar apertado/cortado visualmente na implementação, ajusto para 72px sem re-perguntar.
2. **Overlay (não reflow):** conteúdo NÃO se reajusta quando o menu expande no hover — só o menu flutua por cima. Confirma que é esse o comportamento desejado (é o que a Everfit faz, pelas screenshots).
3. **Sem persistência de estado** (não salva se o usuário "prefere" expandido) — puramente hover, resatura pro colapsado sempre que o mouse sai.
