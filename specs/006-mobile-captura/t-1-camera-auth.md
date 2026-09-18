# T-1: expo-camera + permissões + auth dual nas rotas de captura

**Status:** concluído (QA report-t-1.md aprovado)
**Depende de:** nenhuma

## Objetivo
Habilitar a câmera no app (expo-camera, Expo Go) com permissões, e tornar as rotas de
captura de foot scan acessíveis por bearer (auth dual).

## Passos
1. Instalar `expo-camera` (versão do SDK 54).
2. Permissões: `NSCameraUsageDescription` (iOS) / config plugin; pedir permissão em runtime.
3. Backend: aplicar auth dual (`getRequestSession`/`getEffectiveUser`) nas rotas de captura
   usadas pelo paciente logado: criar scan (`POST /api/foot-scans`), `/upload-local`,
   `/analyze`. (`/api/foot-scans` já está na allowlist do middleware.)
4. Camada `src/api/footscan-capture.ts`: criar scan, upload de foto (FormData), disparar análise.

## Critérios de aceite
- [ ] App pede e obtém permissão de câmera no Expo Go.
- [ ] Criar scan + upload + analyze respondem a bearer (e cookie sem regressão).
- [ ] Escopo por paciente preservado.
