# QA Report — T-2: Auth dual foot-scans + API
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO · curl (auth dual).

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 2.1 | GET /api/foot-scans bearer | 200, lista com FS-2026-00001 | ✅ |
| 2.2 | GET /api/foot-scans/[id] bearer | 200, scanNumber/status/measurements (L/R 260/262, arch Normal, hallux 12.5) | ✅ |
| 2.3 | sem token | 307 (negado pelo middleware) | ✅ |

Backend: `getRequestSession` (dual) nos GET de foot-scans (lista + [id]); `/api/foot-scans`
na allowlist mobile do middleware (strip de headers). Escopo por paciente já existente
(PATIENT só vê o próprio: 403). Camada `src/api/footscans.ts` (fetchFootScans/fetchFootScan).
