# QA Report — T-4: Educação + auth dual na rota
**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO · Playwright/Expo Web + curl.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 4.1 | `/api/education` bearer / sem token | bearer→200 (published:1); sem token→307 (negado) | ✅ |
| 4.2 | Lista de conteúdos | "Cuidando do seu tornozelo" (article) | ✅ |
| 4.3 | Detalhe do conteúdo | título + descrição | ✅ |

Backend: `getServerSession`→`getRequestSession` em `/api/education` GET + prefixo na allowlist
do middleware (mesmo padrão dual auditado na Atividade 2).
Evidência: `screenshots/t4-education-detail.png`. 0 erros console.

Nota: o detalhe exibe título/descrição; o corpo completo (`body`) exigiria endpoint
`/api/education/[id]` dedicado (o select da lista não traz `body`). Registrado p/ fase futura.
