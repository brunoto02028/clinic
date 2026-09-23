# T-4: Dashboard com gráfico de série temporal (12 meses)

**Status:** concluído
**Depende de:** T-1 (sem T-1 o gráfico ficaria zerado igual às barras de
hoje, mesmo dado incompleto)

## Objetivo

Substituir as barras de "% do maior valor" por um gráfico de verdade,
mostrando tendência de receita x despesa mês a mês.

## Contexto

Reaproveita o padrão (não o componente) de
`components/body-assessment/assessment-progress-chart.tsx` — `recharts`
(`AreaChart`/`Line`), já resolve tooltip/legenda/PT-EN. Dataset novo:
`{month, income, expense}` em vez de avaliação por avaliação.

## Passos

1. `app/api/admin/finance/route.ts` (`GET`) — novo agregado por mês
   (últimos 12 meses, `groupBy` por `paidDate` truncado pro mês, separado
   por `type`), devolvido junto com o resto do payload já existente
   (ex.: campo novo `monthlyTrend: [{month, income, expense}]`).
2. `components/admin/finance-revenue-chart.tsx` (novo) — componente
   `recharts` seguindo o padrão do `AssessmentProgressChart` (área pra
   receita, linha pra despesa, tooltip formatado em GBP, eixo X com os 12
   meses).
3. `app/admin/finance/page.tsx` (`DashboardTab`) — troca os dois blocos de
   barra ("Income by Category"/"Expenses by Category" continuam, essas
   são por categoria, úteis do jeito que estão) por incluir o gráfico novo
   acima delas, sempre 12 meses fixos independente do filtro de período
   selecionado (ver Suposição 3 do plan.md).

## Arquivos afetados

- `app/api/admin/finance/route.ts`
- `components/admin/finance-revenue-chart.tsx` (novo)
- `app/admin/finance/page.tsx`

## Critérios de aceite

- [ ] Gráfico mostra os últimos 12 meses, com receita e despesa visíveis
      e corretas (confirmar contra os `FinancialEntry` reais de T-1).
- [ ] Muda o filtro de período (This Month/Last Month/etc.) e o gráfico
      continua mostrando os mesmos 12 meses (não é afetado pelo filtro,
      conforme decisão).
- [ ] Sem dado nenhum ainda (clínica nova) — estado vazio claro, sem
      gráfico quebrado.
