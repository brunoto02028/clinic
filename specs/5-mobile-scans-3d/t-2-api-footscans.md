# T-2: Auth dual nas rotas de foot-scans + camada de API

**Status:** concluído (QA report-t-2.md aprovado)
**Depende de:** nenhuma

## Objetivo
Tornar `GET /api/foot-scans` e `GET /api/foot-scans/[id]` acessíveis por bearer (auth dual)
e criar a camada de API no app.

## Passos
1. Backend: aplicar `getRequestSession`/`getEffectiveUser` (dual) nas rotas GET de foot-scans;
   adicionar `/api/foot-scans` à allowlist mobile do middleware (com strip de headers).
2. Confirmar escopo (paciente só vê os próprios scans).
3. App: `src/api/footscans.ts` — `fetchFootScans()`, `fetchFootScan(id)` (tipos com
   measurements: footLength/width, archHeight/Type, pronation, halluxValgusAngle, status).

## Critérios de aceite
- [ ] GET foot-scans (lista + detalhe) responde a bearer (200) e a cookie (sem regressão).
- [ ] Sem token / inválido → negado.
- [ ] Paciente só vê os próprios scans.
