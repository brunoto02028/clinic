# T-9: Ilustrações originais por IA (DALL·E 3)

**Status:** aguardando GO (estilo + custo)
**Depende de:** T-7, T-8

## Objetivo
Ilustrações originais e profissionais dos exercícios, via o pipeline de imagem que o app já tem (`lib/ai-provider.generateImage` → DALL·E 3 / Gemini), no estilo "educational medical illustration" + marca. Nada de terceiros; nada de SVG à mão.

## Passos
1. Gerar 2–3 **amostras** para o Bruno aprovar estilo/qualidade (custo mínimo).
2. Aprovado + custo autorizado → gerar em escala via `scripts/generate-exercise-illustrations.cjs --go`.
3. Salvar em `public/images/kit/exercises/*` e preencher `illustrationUrl` dos itens.

## Critérios de aceite
- [ ] Estilo aprovado pelo Bruno.
- [ ] Custo autorizado antes de gerar em escala.
- [ ] Imagens originais (IA), consistentes e com a marca; `illustrationUrl` preenchido.
