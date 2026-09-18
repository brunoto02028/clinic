# T-8: Trocar slider de dor por botões numéricos

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
A escala de dor 0-10 na triagem vira botões numéricos individuais (toque direto), em vez de
arrastar uma barra fina — gesto mais fácil pra quem tem menos destreza.

## Contexto
`components/screening/medical-screening-form.tsx:709-729`: hoje é um
`<input type="range" min={0} max={10} value={formData.painScore} onChange={...} className="w-full accent-primary" />`
nativo, 16px de altura, exige arrastar com precisão. Existe um padrão pronto de botões 0-10 já
no projeto, em `components/dashboard/daily-checkin-card.tsx:178-200` (11 `<button>`, um por
número, `Array.from({ length: 11 }, ...)`) — mas ele usa `h-7` (28px), abaixo do alvo de 44px
que estamos perseguindo nesta atividade (ver T-7). Vou seguir a mesma estrutura, com `h-11`
(44px) em vez de `h-7`.

## Passos
1. Em `medical-screening-form.tsx`, substituir o bloco `<input type="range">` (linhas 713-720)
   por uma grade de 11 botões (0 a 10), no mesmo estilo visual de
   `daily-checkin-card.tsx:189-201` — cor de destaque conforme a faixa (leve/moderada/severa,
   reaproveitando a mesma lógica de cor já usada nas linhas 723-724 deste arquivo), `h-11`
   (44px), `onClick` chamando o mesmo `onChange`/`setFormData` handler já existente (linha 718),
   adaptado de `(e) => ...e.target.value...` pra `(v: number) => ...` direto.
2. Em telas pequenas (mobile), 11 botões numa linha só pode ficar apertado — usar `flex-wrap`
   ou `grid grid-cols-6` (2 linhas de ~6/5) se `flex-1` numa única linha ficar estreito demais
   em 390px; testar visualmente e ajustar.
3. Manter os textos "0 - Sem dor" / "10 - Insuportável" e o rótulo de intensidade
   (leve/moderada/severa) como estão, só trocando o controle de input em si.
4. Manter o label superior (`Label` com "Intensidade da dor: X/10") como está.

## Arquivos afetados
- `components/screening/medical-screening-form.tsx`

## Critérios de aceite
- [ ] Os 11 botões (0-10) aparecem, cada um com pelo menos 44px de altura, clicáveis
      individualmente.
- [ ] Selecionar um número atualiza `formData.painScore`, o autosave dispara (`isDirty.current`,
      `saveDraft`, `triggerAutoSave`) igual antes.
- [ ] Em viewport mobile 390px, os 11 botões não cortam nem ficam ilegíveis.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
