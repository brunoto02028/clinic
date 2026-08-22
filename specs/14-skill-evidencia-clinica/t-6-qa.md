# T-6: QA — script real + dry-run + red-flag

**Status:** pendente
**Depende de:** T-1..T-5

## Objetivo
Validar a skill ponta a ponta: o script contra a Europe PMC **real**, um dry-run completo
gerando um relatório de exemplo, e o caso de red-flag parando o fluxo.

## Passos
1. Rodar `node scripts/search_literature.js "patellofemoral pain syndrome exercise therapy" 10`
   com rede real; conferir JSON, campos e ordenação por evidência. Ajustar parsing se preciso.
2. Dry-run: usar uma triagem de exemplo (ex.: o paciente de teste da spec 13) → seguir o
   fluxo da SKILL.md → produzir um relatório preenchido a partir do template, com fontes
   rastreáveis e cruzamento com o `clinic-resources.example.json`.
3. Caso **red-flag**: triagem com sinal de alerta (ex.: dor noturna + perda de peso) → a skill
   **para** e emite só o alerta, sem buscar evidência nem sugerir conduta.
4. Conferir: sem PII enviada à Europe PMC; aviso clínico presente no relatório.

## Arquivos afetados
- `specs/14-skill-evidencia-clinica/qa/report-t-6.md` (evidências: outputs do script, o
  relatório de exemplo, o alerta de red-flag)

## Critérios de aceite
- [ ] Script roda contra a Europe PMC real e retorna evidência classificada/ordenada.
- [ ] Dry-run gera relatório completo, com fontes rastreáveis e cruzamento com o catálogo.
- [ ] Caso red-flag interrompe o fluxo e emite só o alerta.
- [ ] Nenhuma PII na query externa; aviso clínico presente.
