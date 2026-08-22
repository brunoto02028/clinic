# T-4: Tendência de aderência aos exercícios

**Status:** pendente
**Depende de:** T-2 (usa o `TrendChart`/《barras》); independente da T-3

## Objetivo
Mostrar ao paciente sua **aderência ao longo do tempo** — com que constância ele fez os
exercícios — como um gráfico (barras semanais ou linha).

## Contexto
- Fonte assumida: `DailyCheckIn` (schema ~L3463), que registra por dia se os exercícios
  foram feitos, com histórico. (Alternativa discutível: `completedCount`/`lastCompletedAt`
  das prescrições — ver Suposições no plan.md.)
- Sem endpoint de série de aderência hoje.

## Passos
1. API: adicionar `GET /api/patient/adherence?range=<sel>` que devolve uma série agregada
   **por semana** (ou por dia) a partir do `DailyCheckIn` do paciente da sessão:
   `[{ periodStart, doneCount, totalDays, percent }]`.
2. UI na mesma seção "Meu progresso" (T-3): renderizar a série como barras/linha com o
   componente de T-2 (ou uma variação `BarTrend` mínima se barras ficarem melhores).
3. Estado vazio quando não há check-ins.
4. Bilíngue EN/PT.

## Arquivos afetados
- `app/api/patient/adherence/route.ts` (novo)
- `app/dashboard/follow-up/page.tsx` (adicionar o bloco de aderência)
- (possível) `components/dashboard/trend-chart.tsx` (variante de barras) ou componente irmão

## Critérios de aceite
- [ ] `GET /api/patient/adherence` devolve série agregada correta, só do paciente da sessão.
- [ ] Sem sessão → 401; sem check-ins → série vazia (200).
- [ ] UI mostra a aderência ao longo do tempo; estado vazio tratado.
- [ ] Textos EN/PT conforme locale.
- [ ] Sem dependência nova.
