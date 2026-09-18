# QA Report — T-1: Scaffold do app Expo em `mobile/`

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (3/3 cenários)
**Ferramenta:** Playwright sobre Expo Web (`localhost:8081`).

## Ambiente

- Expo SDK **56** (React 19.2.3, RN 0.85.3), Expo Router **~56.2.9**.
- App em `mobile/` no mesmo repositório.

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 1.1 | Subir Expo Web e abrir a URL | App carrega sem erro | Página title "BPR Rehab", tela renderizada | ✅ |
| 1.2 | Config `app.json` | scheme `bprrehab`, bundle `com.bpr.rehab` | Presentes (ios.bundleIdentifier + android.package) | ✅ |
| 1.3 | Console do navegador | Sem erros | **0 erros, 0 warnings** (Playwright console) | ✅ |

## Evidências

- Snapshot de acessibilidade renderizado:
  ```
  - generic: BPR Rehab
  - generic: App nativo — fundação (Fase 0)
  ```
- Screenshot: `qa/screenshots/t1-expo-web-home.png`
- Console (nível error): `Total messages: 2 (Errors: 0, Warnings: 0)`

## Estrutura criada

```
mobile/
├── app/
│   ├── _layout.tsx      Stack root + SafeAreaProvider + StatusBar
│   └── index.tsx        tela inicial (placeholder de validação)
├── src/
│   ├── components/ui/   (vazio — T-3)
│   ├── theme/           (vazio — T-3)
│   ├── api/             (vazio — T-4)
│   ├── store/           (vazio — T-4)
│   └── lib/             (vazio — T-4)
├── app.json             scheme bprrehab, bundle com.bpr.rehab, plugin expo-router
├── babel.config.js      babel-preset-expo
├── tsconfig.json        alias @/* → src/*
└── package.json         main: expo-router/entry
```

## Notas de execução
- Template inicial veio como `blank-typescript` (sem Expo Router). Expo Router foi
  adicionado manualmente conforme a doc versionada do SDK 56
  (`main: expo-router/entry`, `babel-preset-expo`, `plugins: ["expo-router"]`).
- Dependências adicionadas (parte da stack já aprovada): `expo-router`,
  `react-native-safe-area-context`, `react-native-screens`, `expo-linking`,
  `expo-constants`, `react-native-web`, `react-dom`, `babel-preset-expo`.
- Cores de marca aplicadas no placeholder (fundo `#0f172a`, turquoise `#5dc9c0`).
