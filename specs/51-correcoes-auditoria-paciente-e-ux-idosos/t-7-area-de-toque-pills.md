# T-7: Aumentar área de toque dos botões pill/chip

**Status:** concluído
**Depende de:** T-5 (evita conflito de merge no mesmo arquivo `cookie-consent.tsx`)

## Objetivo
Botões de escolha rápida (triagem + banner de cookies) atingem ~44px de altura, o mínimo
recomendado pela Apple pra toque confiável — relevante especialmente pra pacientes com menos
destreza.

## Contexto
Nenhum componente compartilhado (`Pill`/`Chip`/`ToggleGroup`) existe hoje — cada bloco tem sua
própria string de classes Tailwind, repetida. Alturas medidas hoje (todas abaixo de 44px):

Em `components/screening/medical-screening-form.tsx`:
- Sim/Não (red flags), linhas 611-635: `px-4 py-1.5 ...` ≈ 28px
- Tipo de dor, linhas 736-747: `px-3 py-1.5 rounded-full ...` ≈ 28px
- Direita/Esquerda, linhas 867-876 e 882-893: `flex-1 py-2 rounded-lg ...` ≈ 32px
- Sedentário/Ativo, linhas 900-906: `py-2 px-2 rounded-lg ...` ≈ 32px
- Álcool, linhas 965-970: `flex-1 py-2 rounded-lg ...` ≈ 32px

Em `components/cookie-consent.tsx` (depois de T-5, os textos já estarão traduzidos, só a classe
muda aqui): "Accept all"/"Reject non-essential", linhas ~145-156: `px-4 py-2 ...` ≈ 32-36px.

## Passos
1. Em cada um dos 5 blocos de `medical-screening-form.tsx` listados acima, trocar `py-1.5`/`py-2`
   por `min-h-11` (44px) mantendo o padding horizontal existente — usar `min-h-11
   flex items-center justify-center` (ou equivalente) em vez de só aumentar `py-*`, pra garantir
   44px mesmo com o texto do label maior (ex.: "Sedentário" em português é mais longo que
   "Sedentary").
2. Em `components/cookie-consent.tsx`, mesma troca nos botões "Accept all"/"Reject
   non-essential" (e "Save preferences"/"Reject all" do painel expandido, linhas 164-254, se
   também estiverem abaixo de 44px).
3. Não criar um componente `PillButton` compartilhado nesta tarefa — é uma ideia de refactor
   futuro (registrada no `plan.md`), não necessária pro fix em si.

## Arquivos afetados
- `components/screening/medical-screening-form.tsx`
- `components/cookie-consent.tsx`

## Critérios de aceite
- [ ] Todos os botões pill/chip listados medem pelo menos 44px de altura (`getComputedStyle` ou
      `getBoundingClientRect`), em português e em inglês (texto mais longo não pode cortar).
- [ ] Layout visual continua coerente (sem quebra de linha inesperada, sem overflow) em viewport
      mobile 390px.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
