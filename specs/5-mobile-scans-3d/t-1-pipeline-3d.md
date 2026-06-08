# T-1: Pipeline 3D nativo (prova no emulador Android)

**Status:** concluído (QA report-t-1.md aprovado — evidência no emulador)
**Depende de:** nenhuma

## Objetivo
Provar que o pipeline `expo-gl` + `expo-three` + `@react-three/fiber` (native) renderiza
3D no emulador Android com Expo SDK 56 / React 19. Tarefa de MAIOR RISCO — primeiro.

## Passos
1. Instalar: `expo-gl`, `expo-three`, `@react-three/fiber` (+ `three` se preciso). Resolver
   versões compatíveis; se houver incompatibilidade com fiber, cair para `expo-three` + THREE direto.
2. Criar `app/(app)/_dev/three.tsx` (ou rota dev) com uma cena mínima: um mesh girável
   (cubo/esfera) com luz, via Canvas do fiber/native ou GLView do expo-gl.
3. Subir um dev build/Expo no emulador Android (ANDROID_HOME do Homebrew) e renderizar.
4. Capturar screenshot via `adb exec-out screencap`.

## Critérios de aceite
- [ ] Libs instaladas e resolvidas para Expo SDK 56.
- [ ] Cena 3D renderiza no emulador Android (screenshot de evidência).
- [ ] Sem crash de GL/contexto; abordagem (fiber vs three direto) documentada.
