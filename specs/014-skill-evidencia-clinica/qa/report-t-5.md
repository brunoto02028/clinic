# QA Report — T-5: clinic-resources (example + gerador + real)

**Data:** 2026-08-22 · **Resultado:** APROVADO (2/2) com nota

- **5.1** `templates/clinic-resources.example.json` é JSON válido, com `equipment`, `exercises`,
  `protocols` e `_note` de instrução de cópia. `clinic-resources.json` gerado também válido.
- **5.2** Campos compatíveis com os modelos do DB (`Exercise`: name/namePt/bodyRegion/
  difficulty/tags/defaults; `ProtocolTemplate`: name/condition/bodyRegion/equipment/
  estimatedWeeks/sessionsPerWeek). Exemplos do `.example` claramente fictícios.
- **Gerador:** `scripts/generate_clinic_resources.mjs` rodado contra o banco **local** →
  **14 exercícios reais**, 0 protocolos, 0 equipamentos.
- **NOTA (não-bloqueante):** protocolos/equipamentos vazios porque o banco local é de dev; o
  catálogo real e completo exige rodar o gerador contra **produção** (o script avisa isso no
  stdout). Decisão registrada no plan.md.
