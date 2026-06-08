# QA Report — T-1: Pipeline 3D nativo (prova no Android)

**Data:** 08/06/2026 · **Resultado:** ✅ APROVADO · Emulador Android (Pixel_7_API_34) via adb.

## Resultado
| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 1.1 | Cena 3D renderiza no emulador | Cubo 3D turquesa com sombreamento, fundo `#0f172a`, animado | ✅ |
| 1.2 | Sem crash de contexto GL; abordagem documentada | Renderiza após fix de versão (ver abaixo) | ✅ |

**Evidência:** `qa/screenshots/t1-cube-android.png` (cubo 3D no Pixel_7_API_34, build nativo).

## Abordagem (decidida na prova)
- **`expo-gl` + `expo-three` + `three` direto** (sem `@react-three/fiber`) — evita a restrição
  de versão de React do fiber. Cena com `GLView` + `Renderer` + `THREE.Scene`.
- **Execução:** `expo run:android` (build nativo local, Gradle) — **não** Expo Go, pois a
  API do Expo estava com timeout (Expo Go não baixaria). BUILD SUCCESSFUL em ~9m23s.

## Fricções encontradas e resolvidas (o objetivo da T-1)
1. **API do Expo com timeout** → `expo install` falhava. Contornado lendo a versão de
   `expo/bundledNativeModules.json` (`expo-gl ~56.0.5`) e instalando via **npm direto**.
2. **`three` ^0.166 incompatível** → `THREE.WebGLRenderer: WebGL 1 is not supported since
   r163`. O `expo-gl` fornece contexto **WebGL 1**. **Fix: downgrade para `three@0.162.0`**
   (última versão com WebGL 1). Re-bundle do Metro (JS puro, sem novo Gradle build).
3. **emulador headless instável** (crashou 1×); `adb unauthorized` resolvido com cold boot.

## Versões finais (compatíveis)
- `expo-gl ~56.0.5`, `expo-three ^8.0.0`, **`three 0.162.0`** (pinado por causa do WebGL 1).

## Dívidas menores
- Warning não-fatal "Can't perform a React state update…" do `bootstrap` no `_layout` (setState
  assíncrono). Corrigir com guard/mounted check. Não afeta o 3D.
- `android/` é gerado pelo prebuild (gitignored) — build local, não versionado.
