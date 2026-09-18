# T-4: Viewer 3D nativo do foot scan (procedural)

**Status:** concluído
**Depende de:** T-1, T-2, T-3

## Objetivo
Tela de detalhe do foot scan com viewer 3D nativo girável, gerado a partir das measurements
(reusa a lógica `generateFootGeometry` do web, adaptada para expo-gl/three).

## Passos
1. Portar a geração de geometria do pé (de `components/scans/foot-3d-viewer.tsx`) para um
   módulo reutilizável no app, adaptado ao pipeline definido na T-1.
2. `app/(app)/foot-scan/[id].tsx`: busca o scan (T-2), renderiza o pé 3D (L/R) com OrbitControls
   nativos (gesto de rotação) + exibe measurements (comprimento, largura, arco, pronação).
3. Estados loading/erro; fallback se measurements ausentes.
4. Validar no emulador Android (screenshot do modelo girável).

## Critérios de aceite
- [ ] Detalhe renderiza o pé 3D no emulador Android (evidência).
- [ ] Gesto rotaciona o modelo.
- [ ] Measurements reais exibidas junto ao 3D.
