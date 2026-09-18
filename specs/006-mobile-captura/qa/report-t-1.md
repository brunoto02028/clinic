# QA Report — T-1: expo-camera + auth dual nas rotas de captura
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO · curl (auth dual).

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 1.2a | `POST /api/foot-scans` (criar) bearer | 201 + scanId | ✅ |
| 1.2b | `POST /analyze` bearer (paciente) | **403 "Only staff can run analysis"** | ✅ (regra de papel) |
| 1.2c | criar sem token | 307 (negado) | ✅ |

- `expo-camera@17.0.10` (SDK 54) instalado + plugin de permissão no `app.json`.
- Auth dual aplicada em `POST /api/foot-scans`, `/upload-local` (token OU sessão/bearer),
  `/analyze`. Camada `src/api/footscan-capture.ts` (createFootScan, uploadFootPhoto, analyzeFootScan).

## Descoberta de domínio (ajusta o escopo)
`/analyze` é **staff-only** — o **paciente não dispara a análise (Gemini)**. No app do
paciente o fluxo correto é **capturar + enviar as fotos**; a extração de measurements é um
passo **da clínica** (staff). O paciente acompanha o **status** e vê o resultado (measurements
+ viewer 3D) quando a clínica processa. A T-3 foi ajustada a isso.

Permissão de câmera e captura real: validação no iPhone (Expo Go) — T-2.
