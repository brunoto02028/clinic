# T-7: Scaffold do pipeline de conteúdo + illustrationUrl

**Status:** ✅ estrutura montada
**Depende de:** T-1

## Objetivo
Deixar a Fase 2 pronta para começar: campo de ilustração no item de protocolo, gerador de imagens (guardado, não roda sozinho) e o fluxo documentado.

## Entregue
- `ProtocolTemplateItem.illustrationUrl` (aditivo) — aplicado em local + prod.
- `scripts/generate-exercise-illustrations.cjs` — scaffold **guardado**: por padrão faz **dry-run** (só imprime os prompts/arquivos-alvo); só gera com a flag `--go` E uma chave de imagem configurada.
- Pipeline documentado no `plan.md` (Fase 2).

## Critérios de aceite
- [x] Coluna `illustrationUrl` existe em local e prod.
- [x] Script não gera nada sem `--go` (nenhum custo acidental).
- [x] Roadmap de regiões/condições no plan.md.
