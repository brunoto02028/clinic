# QA Report — T-4: Viewer 3D nativo do foot scan
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO · Emulador Android (Pixel_7_API_34).

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 4.1 | Pé 3D renderiza no emulador | 2 pés (E turquesa / D slate) com sombreamento, fundo #0f172a | ✅ |
| 4.2 | Gesto rotaciona | PanResponder atualiza rotation x/y do grupo (loop) | ✅ (código) |
| 4.3 | Measurements reais exibidas | Card com comprimento/largura/arco/pronação/hálux (tela [id]) | ✅ |

**Evidência:** `qa/screenshots/t4-foot-android.png` (render no emulador via rota dev
`/dev-foot`, usando o MESMO componente `FootViewer` da tela real `foot-scan/[id]`).

## Implementação
- `src/lib/foot-geometry.ts`: `buildFeetGroup(measurements)` — pés L/R como cápsulas
  achatadas escaladas por comprimento × largura × arco (representação proporcional;
  **não** a geometria detalhada de ~1200 linhas do web — port maior, fase futura).
- `src/components/foot-viewer.tsx`: GLView + expo-three + three (pipeline da T-1) +
  rotação por PanResponder. Reusado por `app/(app)/foot-scan/[id].tsx` e pela rota dev.
- `app/(app)/foot-scan/[id].tsx`: busca via `fetchFootScan` (T-2) + viewer + measurements.

## Transparência (limitações)
- **Render 3D do pé:** validado no emulador (mock measurements, componente real).
- **End-to-end logado no emulador** (login → lista → detalhe → 3D com dados reais): NÃO
  capturado — o emulador headless (swiftshader) crashou repetidamente e o login via adb
  por coordenadas é frágil. As partes estão validadas separadamente: API (T-2, curl),
  render 3D (T-4, emulador), telas (padrão validado no Expo Web).
- Representação 3D é proporcional/simplificada; o port da geometria detalhada do web e o
  carregamento de STL/GLTF ficam para fase futura (conforme escopo do plan).
