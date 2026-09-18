# QA Report — T-3: Regressão consolidada (personal x clínica)

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado

## Cenário 10 — Clínica (não-personal) idêntico

- **Passos:** login como `qa.admina@example.test` (clínica), viewport 1440×900, contexto de navegador isolado com cache desabilitado.
- **Colapsado:** `nav[aria-label="Admin navigation"]` bounding box `{width: 68}`.
- **Expandido (hover):** `{width: 220}`.
- **Labels corretos do tenant clínica:** `["Schedule","Patients","Notifications","Clinical","Marketing","Finance","Settings","EN","PT","Sign out"]` — sem "Training"/"Challenges"/"Nutrition" (que são `personalOnly`, corretamente ausentes), com "Marketing" presente (que é `clinicalOnly`, corretamente visível só pra clínica) — confirma que a filtragem `visibleAdminSections(isPersonal)` continua intacta com o hover-expand.
- **Evidência:** `screenshots/t3-clinic-collapsed.png`, `screenshots/t3-clinic-expanded.png`

## Conclusão consolidada (T-1 + T-2 + T-3)

Todos os critérios de aceite das três tarefas foram verificados com evidência real (screenshots + medições de bounding box/computed style), incluindo os 5 achados da revisão de código (ver addendum em `report-t-1-t-2.md`). Comportamento idêntico entre tenant personal e clínica, mobile inalterado, sem regressão de acessibilidade por teclado, sem remount desnecessário de componentes com fetch próprio.
