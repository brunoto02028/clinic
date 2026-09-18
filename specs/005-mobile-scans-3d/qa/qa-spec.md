# QA Spec — Atividade 5: Scans 3D nativos (Fase 3)

Validação no EMULADOR ANDROID (Pixel_7_API_34) via adb (screenshots). API via curl (auth dual).
Expo Web NÃO valida o GL nativo.

## T-1 Pipeline 3D
- 1.1 Emulador: cena 3D (mesh girável) renderiza — screenshot via adb
- 1.2 Sem crash de contexto GL; abordagem documentada

## T-2 API foot-scans (auth dual)
- 2.1 GET /api/foot-scans bearer → 200 (scans do paciente)
- 2.2 GET /api/foot-scans/[id] bearer → 200 (measurements)
- 2.3 cookie (web) → 200 (sem regressão); sem token → negado
- 2.4 escopo: paciente não vê scan de outro

## T-3 Lista
- 3.1 Emulador/Expo Web: lista de scans reais (ou vazio)
- 3.2 toque abre detalhe

## T-4 Viewer 3D
- 4.1 Emulador: pé 3D renderiza no detalhe — screenshot
- 4.2 gesto rotaciona o modelo
- 4.3 measurements reais exibidas
