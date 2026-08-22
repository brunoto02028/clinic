# QA Report — T-2: references/red-flags.md

**Data:** 2026-08-22 · **Resultado:** APROVADO (2/2)

- **2.1** Cobre as categorias: neurológicas (cauda equina, déficit progressivo, mielopatia),
  fratura/trauma, malignidade (dor noturna, perda de peso, história de câncer), infecção,
  vascular (TVP/TEP), inflamatória sistêmica, e "outros de atenção". Cada uma com sinais
  reconhecíveis a partir da triagem.
- **2.2** Ação clara por categoria: **parar o fluxo, não gerar sugestão, emitir alerta**;
  emergência sinalizada nas categorias 1 e 5. Tom conservador explícito ("na dúvida, é red flag").
- Exercício empírico: o dry-run de red-flag (`qa/red-flag-alert-example.md`) interrompe o fluxo
  corretamente antes da busca.
