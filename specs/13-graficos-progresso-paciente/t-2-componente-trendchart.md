# T-2: Componente `TrendChart` (SVG in-house, reutilizável)

**Status:** pendente
**Depende de:** nenhuma (pode ser feita em paralelo à T-1)

## Objetivo
Um componente de gráfico de linha **sem dependência externa**, desenhado em SVG,
reutilizável por qualquer métrica (dor, função, aderência), com tema claro/escuro e
bilíngue.

## Contexto
- Padrão já usado em `app/dashboard/blood-pressure/page.tsx` (`PPGWaveformChart`):
  `<svg viewBox>`, `path`, gradiente, `preserveAspectRatio`. Reaproveitar a abordagem.
- Tema: usar tokens/cores do design system existente (não hardcode que quebre no dark).
- Responsivo: largura fluida, `overflow-x` quando necessário; nada de scroll horizontal
  na página.

## Passos
1. Criar `components/dashboard/trend-chart.tsx`:
   - Props: `points: { x: number|string; y: number|null }[]`, `label`, `unit`,
     `min`/`max` (ex.: VAS 0–10, %), `higherIsBetter: boolean`, `color?`.
   - Renderiza: eixos/《grid》leve, linha (`polyline`/`path`), pontos, rótulos de eixo,
     e o valor mais recente em destaque.
   - `higherIsBetter=false` (dor): indica melhora quando a linha cai (cor/《ícone》de
     tendência coerente).
2. Tooltip/《hover》simples mostrando `y` e a data do ponto (pode ser título nativo do SVG
   ou div posicionada — sem lib).
3. Estado vazio: se `points.length < 2`, renderiza mensagem
   ("ainda sem histórico suficiente") em vez do gráfico.
4. Acessibilidade: `aria-label` descrevendo a métrica e a tendência.

## Arquivos afetados
- `components/dashboard/trend-chart.tsx` (novo)

## Critérios de aceite
- [ ] Renderiza uma linha correta para uma série de ≥2 pontos.
- [ ] `< 2` pontos → estado vazio, sem SVG quebrado.
- [ ] Funciona em tema claro e escuro (cores via tokens).
- [ ] `higherIsBetter=false` sinaliza melhora quando o valor cai.
- [ ] Sem dependência nova no `package.json`.
- [ ] Não causa scroll horizontal na página.
