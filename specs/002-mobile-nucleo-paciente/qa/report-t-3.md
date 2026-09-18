# QA Report — T-3: Home (dashboard)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO (3/3) · Playwright/Expo Web.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 3.1 | Saudação com nome real | "Olá, Sarah" | ✅ |
| 3.2 | Próximo agendamento | "Physiotherapy · qua., 10 de jun. de 2026, 22:44 · com James Carter" | ✅ |
| 3.3 | Atalhos navegam | Ver agenda → `/appointments` (validado) | ✅ |

Evidência: `qa/screenshots/t3-home.png`. Estado vazio e de erro tratados.
Consome `/api/auth/mobile/me` + `/api/appointments` (bearer). Datas em pt-BR (pós-review).
