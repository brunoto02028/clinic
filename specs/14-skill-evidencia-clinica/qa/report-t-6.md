# QA Report — T-6: Integração (dry-run ponta a ponta)

**Data:** 2026-08-22 · **Resultado:** APROVADO (3/3)

- **6.1** Caso sem red flag (dor patelofemoral) → fluxo completo: busca real na Europe PMC →
  seleção por nível → cruzamento com `clinic-resources.json` → relatório preenchido
  (`qa/dry-run-report-example.md`) com fontes rastreáveis [F1..F3] e separação
  disponível/fora-do-catálogo.
- **6.2** Caso **red-flag** (dor noturna + perda de peso + história de câncer) → skill
  **interrompe** antes da busca, emite só o alerta, zero sugestão
  (`qa/red-flag-alert-example.md`). ✅
- **6.3** Aviso clínico presente no relatório; **nenhuma PII** enviada à Europe PMC (só a
  condição na query).

## Resumo da atividade 14
Artefatos: 24 cenários — **todos aprovados**, 1 nota não-bloqueante (catálogo local sem
protocolos/equipamentos, por ser banco de dev). Skill funcional ponta a ponta, com a busca de
literatura **validada contra a API real** (o que o doc original não havia conseguido testar).
