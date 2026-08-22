# QA Report — T-3: Seção "Meu Progresso"

**Data:** 2026-08-22
**Resultado geral:** APROVADO (7/7)

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 3.1 | Seção com gráficos dor/ADL/Sport/função | UI | APROVADO |
| 3.2 | Valores batem com o banco | UI | APROVADO |
| 3.3 | Janela 30d/90d/tudo muda a série | UI | APROVADO |
| 3.4 | Sem histórico → estado vazio + CTA | UI | APROVADO (por código) |
| 3.5 | Locale PT-BR e EN-GB | UI | APROVADO |
| 3.6 | Timeline/scores atuais sem regressão | UI | APROVADO |
| 3.7 | Mobile renderiza igual | UI | APROVADO |

**3.1** Em `/dashboard/follow-up` a seção "Meu Progresso" mostra 4 TrendCharts (Dor `#ef4444`,
FAAM ADL `#3b82f6`, FAAM Sport `#a855f7`, Função `#10b981`) + barras de aderência.
`t3-meu-progresso-claro.png`.

**3.2** Último valor + delta desde o 1º registro: Dor 3 (-5), ADL 86% (+41), Sport 71% (+41),
Função 82% (+42) — batem com a série da API/seed.

**3.3** 30d reduz a série (`t3-janela-30d.png`); Tudo mostra 6 pontos / 7 barras
(`t3-meu-progresso-claro.png`). Rede confirma refetch `range=30d` e `range=all` (200).

**3.4** Por código: `!hasOutcome && !hasAdherence` → mensagem "Ainda sem medidas registadas…/
No measures recorded yet…" + CTA para `/dashboard/outcome-measures` (`page.tsx`).

**3.5** PT: "Meu Progresso", "Dor (EVA 0–10)", "FAAM Desporto", "Função Geral", "Tudo".
EN (`t3-locale-en.png`): "My Progress", "Pain (VAS 0–10)", "FAAM Sport", "Overall Function",
"Adherence (weekly)", "All". Default `en-GB`.

**3.6** "Scores Actuais" e "Cronologia do Tratamento" continuam intactos abaixo da nova seção.

**3.7** Em 390px a seção renderiza empilhada, sem quebras (`t2-mobile-390.png`).

Console: 0 erros.
