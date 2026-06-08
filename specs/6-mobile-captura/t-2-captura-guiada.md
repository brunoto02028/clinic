# T-2: Tela de captura guiada

**Status:** pendente
**Depende de:** T-1

## Objetivo
Fluxo guiado de captura: para cada ângulo (plantar, medial, lateral, anterior, posterior),
mostrar instrução, abrir a câmera, tirar a foto, preview/refazer, e avançar.

## Passos
1. `app/(app)/foot-scan/capture.tsx`: stepper por ângulo (E/D), CameraView do expo-camera.
2. Tirar foto → preview → confirmar/refazer → próximo ângulo.
3. Upload de cada foto (FormData) via camada da T-1, associando foot + ângulo.
4. Estados de progresso, erro de upload, retry. Botão para iniciar a partir da lista de scans.

## Critérios de aceite
- [ ] Captura sequencial dos ângulos com instruções.
- [ ] Preview + refazer por foto.
- [ ] Upload de todas as fotos do scan.
