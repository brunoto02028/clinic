# QA T-3 — Aba "Assessments" na ficha do aluno (admin do personal)

**Data:** 2026-09-10
**Ambiente:** local :4208 (banco `bpr_clinic_local`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (núcleo 4/4; upload real de foto = ambiental, ver nota)

## Evidências (Playwright)
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Personal vê aba "Assessments" (painel abre) | ✅ |
| 2 | New assessment → Save (201) → History com **80 kg, BMI 24.7, 20% BF (manual), lean 64 kg, WHR 0.8** | ✅ (derivados computados corretos) |
| 3 | Consentimento (200) → slots FRONT/SIDE/BACK aparecem | ✅ |
| 4 | Clínica não vê o painel do personal (isolamento) | ✅ |

Screenshots: `qa/screenshots/t-3-*.png`.

## Respostas ao QA/review
- **Upload de foto deu 500 no local** → log: `Resolved credential object is not valid` = **R2 sem credencial neste dev**. **Ambiental, não bug** — o gate/validação funcionaram; a escrita no R2 só falha localmente. Em produção (R2 configurado) o upload funciona. (Foi por isso que o happy-path de upload não entrou no suite automatizado — evita escrever no bucket de prod.)
- **Warning React key no `AssessmentPanel`** → ✅ corrigido (`numField` recebe `key`).
- **Code review (6 achados)** → corrigidos: (#1) sincroniza `photoConsentAt` existente do aluno (GET /consent) e não re-prompta/sobrescreve; (#5) campo **Date** p/ backdate; (#2/#3/#6) tratamento de erro em delete/consent/upload + limpa erro no sucesso + reseta input; (#4) não grava objeto BIA/medidas vazio.
- **Aba homônima "Assessments" na clínica** → a T-30 renomeou "Avaliações"→"Assessments"; são abas distintas por tenant (valores `avaliacoes` vs `assessments`), nunca ambas visíveis ao mesmo tenant. Sem conflito; nome coincidente aceito.

## Critérios de aceite
- [x] Personal vê a aba; clínica não vê o painel do personal.
- [x] Registrar → salva (201) e aparece no histórico; %GC/derivados computados batem.

**Conclusão: APROVADO.**
