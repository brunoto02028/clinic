# QA Report — T-4: Agendamentos (lista + detalhe)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO (3/3) · Playwright/Expo Web.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 4.1 | Lista de agendamentos reais | 2 itens (Physiotherapy CONFIRMED, Initial Assessment COMPLETED) | ✅ |
| 4.2 | Toque abre detalhe correto | `/appointment/[id]` → Physiotherapy, Status CONFIRMED, 60 min, James Carter | ✅ |
| 4.3 | Estado vazio | tratado (`appointments-empty`) | ✅ |

Evidência: `qa/screenshots/t4-appointment-detail.png`. Escopo: API filtra `patientId`.
Correções pós-review: `fetchAppointment` valida `id` (evita "Invalid Date"); pull-to-refresh.
