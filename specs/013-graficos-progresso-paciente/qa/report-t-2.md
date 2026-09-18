# QA Report — T-2: Componente TrendChart

**Data:** 2026-08-22
**Resultado geral:** APROVADO (5/6; 1 ressalva não-bloqueante)

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 2.1 | ≥2 pontos → linha + destaque do último | UI | APROVADO |
| 2.2 | 1/0 pontos → estado vazio, sem SVG quebrado | UI | APROVADO (por código) |
| 2.3 | Tema claro/escuro legível | UI | RESSALVA |
| 2.4 | `higherIsBetter` coerente (dor cai = bom) | UI | APROVADO |
| 2.5 | 390px sem scroll horizontal | UI | APROVADO |
| 2.6 | Sem dependência nova | build | APROVADO |

**2.1** `t3-meu-progresso-claro.png`: linhas com área/gradiente, ponto atual destacado, valor
headline (Dor 3, ADL 86%, Sport 71%, Função 82%) e delta chip. Aria-label presente
(`"Dor (EVA 0–10): tendência de 6 registos, a melhorar"`).

**2.2** Por código: `enough = kind==="bar" ? valued.length>=1 : valued.length>=2`; abaixo disso
renderiza "Sem histórico suficiente…/Not enough history…". No 30d o gráfico de Dor ficou com
2 pontos e renderizou corretamente.

**2.3** RESSALVA (não é defeito do componente). O componente é theme-aware por código (tokens
`bg-card`, `border-border`, `text-muted-foreground`, `bg-popover`, `stroke-card`, variantes
`dark:`). Porém o `globals.css` não define superfície `.dark` para o dashboard do paciente
(só o shell admin é escuro, por design) — logo não há tema escuro para validar visualmente
nessa página. Componente está pronto para dark; cenário não é exercitável no app como está.

**2.4** Dor (`higherIsBetter=false`), delta -5 → chip **verde** com seta pra cima ("a melhorar").
Aderência (`higherIsBetter=true`), delta -8% → chip **vermelho** ("a piorar"). Coerente.

**2.5** Em 390px: `scrollWidth == clientWidth == 384` (sem scroll horizontal). `t2-mobile-390.png`:
gráficos empilham em coluna única, largura fluida via ResizeObserver.

**2.6** `git diff --stat package.json` = vazio. SVG in-house; só `lucide-react` (já existente).

Screenshots: `t3-meu-progresso-claro.png`, `t2-hover-tooltip-crosshair.png`, `t2-mobile-390.png`.
Console: 0 erros.
