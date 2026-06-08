# QA Report — T-5: Exercícios prescritos (lista + detalhe)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO (3/3) · Playwright/Expo Web.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 5.1 | Lista de exercícios prescritos | "Calf Raises · 3x12 · Daily · ANKLE_FOOT" | ✅ |
| 5.2 | Detalhe com instruções | séries/reps/freq + descrição + instruções + nota do terapeuta | ✅ |
| 5.3 | Estado vazio | tratado (`exercises-empty`) | ✅ |

Evidência: `qa/screenshots/t5-exercise-detail.png`. Consome `/api/exercises` (bearer).
Detalhe reusa o cache da query; correção pós-review: "Exercício não encontrado" ≠ erro de carga.
