# QA Report — T-3: Design system base

**Data:** 07/06/2026
**Resultado:** ✅ APROVADO (3/3 cenários)
**Ferramenta:** Playwright sobre Expo Web (`localhost:8081/dev/ui`).

## Resultados

| # | Cenário | Esperado | Obtido | OK |
|---|---------|----------|--------|----|
| 3.1 | Abrir `/dev/ui` | Componentes renderizam | Text, Button(4 variantes), Input, Card, Spinner renderizados | ✅ |
| 3.2 | Cores/tipografia | Coerentes com o web | Primary `#607d7d`, Secondary `#5dc9c0` (marca BPR); hierarquia tipográfica visível | ✅ |
| 3.3 | Button loading/disabled | Estado visual correto | Disabled com opacidade reduzida; loading usa ActivityIndicator + bloqueia toque | ✅ |

## Evidências
- Screenshot: `qa/screenshots/t3-design-system.png` (cores de marca confirmadas visualmente).
- Console: **0 erros**.
- Alias `@/*` → `src/*` resolveu corretamente (imports `@/theme/useTheme`, `@/components/ui`).

## Entregue
```
src/theme/
├── tokens.ts        paleta (brand + neutros + feedback), spacing, radius, fontSize, fontWeight
├── index.ts         temas light/dark (mapeamento semântico) + objeto theme
└── useTheme.ts       hook que resolve o tema pelo color scheme do SO
src/components/ui/
├── Text.tsx          variantes title/subtitle/body/label/caption
├── Screen.tsx        container com safe-area, scroll e padding opcionais
├── Button.tsx        primary/secondary/ghost/danger + loading + touch target 48px
├── Input.tsx         label, foco, erro
├── Card.tsx          superfície com borda
├── Spinner.tsx       indicador temático
└── index.ts          barrel
app/dev/ui.tsx        showcase (rota /dev/ui)
```

## Nota
- A spec citava rota `/_dev/ui`, mas o Expo Router **ignora segmentos com prefixo `_`**
  (privados). Showcase movido para `app/dev/ui.tsx` → rota `/dev/ui`.
- Tema dark implementado (mapeamento semântico); validação visual feita no tema light
  (color scheme atual do navegador de teste).
