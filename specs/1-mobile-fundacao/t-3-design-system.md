# T-3: Design system base (tema + componentes)

**Status:** concluído (QA `report-t-3.md` aprovado 3/3)
**Depende de:** T-1

## Objetivo
Criar a camada de tema do app a partir dos tokens visuais do web (Tailwind atual) e um
conjunto mínimo de componentes base reutilizáveis, garantindo consistência visual com a
marca BPR Rehab.

## Contexto
O web usa Tailwind (`tailwind.config.ts`) com paleta e tipografia definidas. O app nativo
precisa de um equivalente: tokens (cores, espaçamentos, raios, tipografia) + componentes
primitivos. Sem trazer Tailwind para RN nesta fase — usar `StyleSheet`/tema simples para
manter leve. Cores de marca da clínica virão do token de auth nas fases seguintes; aqui
ficam os defaults.

## Passos
1. Extrair tokens relevantes de `tailwind.config.ts` (cores primária/secundária, fundo
   `#0f172a` usado no splash/status bar, etc.) para `mobile/src/theme/tokens.ts`.
2. Criar `theme/index.ts` com tipografia, espaçamentos, raios e helper de tema.
3. Componentes base em `mobile/src/components/ui/`: `Screen`, `Text`, `Button`,
   `Input`, `Card`, `Spinner`.
4. Suporte a tema claro/escuro coerente com o web (defaults).
5. Tela de showcase temporária (rota `/_dev/ui`) para inspecionar os componentes no Expo Web.

## Arquivos afetados
- `mobile/src/theme/tokens.ts` (novo)
- `mobile/src/theme/index.ts` (novo)
- `mobile/src/components/ui/*` (novos)
- `mobile/app/_dev/ui.tsx` (showcase temporário)

## Critérios de aceite
- [ ] Tokens de cor/tipografia refletem a identidade do web.
- [ ] Componentes base renderizam corretamente no Expo Web.
- [ ] `Button` tem estados (default, loading/disabled) e área de toque adequada.
- [ ] `Input` integra com formulário (controlado).
