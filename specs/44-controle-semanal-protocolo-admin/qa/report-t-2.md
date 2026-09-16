# QA Report — T-2: UI — itens agrupados por semana + liberar/esconder semana

**Data:** 2026-09-16 (2 rodadas)
**Resultado geral:** ✅ aprovado (com 1 ajuste de layout mobile aplicado após a 1ª rodada — ver fim)
**Ambiente:** Produção, aba Protocol da ficha de paciente de teste (`QA44 A…`), 1280px e 390px,
cache limpo via CDP antes de confiar no que renderiza.

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Grupos "Week 1", "Weeks 1-2", "Weeks 3-4"… com os mesmos rótulos da tela da paciente, contagem e estado | ✅ |
| 2 | Semanas ≥ 3 escondidas → resumo "Patient currently sees: Weeks 1–2" | ✅ |
| 3 | "Release week" em Weeks 3-4 → grupo "Visible to patient", resumo "Weeks 1–4", paciente recebe `1-1, 1-2, 3-4` (14 itens) | ✅ |
| 4 | "Hide week" no mesmo grupo → "Hidden", resumo volta a "Weeks 1–2" | ✅ |
| 5 | Esconder 1 item (olho) dentro de Weeks 1-2 → "Partly visible" e botão vira "Release week"; "Release week" reexibe tudo | ✅ |
| 6 | Editar / olho / duplicar / apagar funcionam dentro dos grupos | ✅ (ver report-t-3) |
| 7 | Grupos recolhidos por padrão, exceto os que a paciente está vendo | ✅ |
| 8 | 390px: sem overflow do componente | ✅ após ajuste |
| 9 | Sem erro de JS no console | ✅ |

## Evidências
- `screenshots/t2-grupos-botoes.png` — grupos, estados e botões (1280px).
- `screenshots/t2-release-week-3-4.png` — depois do "Release week".
- `screenshots/t2-partly-visible.png` — "Partly visible" com um item escondido.
- `screenshots/t2-mobile-390-b.png` — 390px (1ª rodada, antes do ajuste).

## Achado e correção
Em 390px o selo "Visible to patient" quebrava em 3 linhas e encostava no botão "Hide week".
Cabeçalho do grupo passou a quebrar linha (o botão desce quando falta espaço; selo e contagem
sem quebra interna). Reverificado após deploy — ver `t2-mobile-390-c.png`.

## Nota sobre as evidências
Durante a sessão, a aba automatizada parou de repintar depois de um redimensionamento (os prints
saíam idênticos/pretos). Checagens dessa fase foram feitas pelo DOM (textos, `elementFromPoint`) e
pela API; os prints finais foram tirados numa aba nova da mesma sessão.
