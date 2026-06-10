# QA Report — T-2: Tela de captura guiada
**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO (backend+bundle) / captura visual no device.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 2.3 | Upload de foto (bearer, multipart) | 200 `{success, imageUrl, totalImages:1}`, persistido em FS-2026-00003 | ✅ |
| — | Bundle iOS compila com expo-camera + tela de captura | 200, 10.8 MB | ✅ |
| 2.1/2.2 | Permissão de câmera, captura, preview/refazer | implementado (`capture.tsx`) | ⏳ validar no iPhone (Expo Go) |

- `app/(app)/foot-scan/capture.tsx`: `CameraView` (expo-camera) + stepper de 6 ângulos
  (E/D: plantar/medial/lateral), preview, refazer, upload sequencial via `uploadFootPhoto`.
- Botão "Capturar novo scan" na lista de scans.

Nota: permissão/câmera/preview rodam no device — eu não controlo o iPhone; validação visual
é do usuário. Backend (criar scan + upload) validado via curl.

## ✅ Validação no iPhone real (Expo Go) — 08/06/2026
Usuário capturou no device: câmera abriu, 6 fotos tiradas e enviadas. Confirmado no
backend — arquivos persistidos em `public/uploads/scans/FS-2026-00004/`:
`left-plantar`, `left-medial`, `left-lateral`, `right-plantar`, `right-medial`, `right-lateral`.
Scan → status SCANNING. Captura nativa **validada end-to-end no device físico**.

## ✅ Validação da escala (shoe size + A4) no iPhone — 09/06/2026
Scan FS-2026-00006 capturado no device com o passo inicial: `captureMetadata =
{"shoeSize":"BR 41","scaleReference":"A4"}` + 6 fotos persistidas. Âncoras de escala
prontas para a análise da IA.
