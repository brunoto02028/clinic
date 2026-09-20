# QA Report — T-2: Reconciliação automática do disparo + fila de reprocessamento

**Data:** 2026-09-20
**Resultado geral:** ✅ aprovado

## Metodologia

Ambiente: banco local `bpr_clinic_local`, `AI_STRICT_MODE=true` confirmado antes de qualquer teste.
`npx tsc --noEmit -p .` (filtrado com `grep -v "^reconstruir/"`) rodado primeiro: zero erros novos em
`lib/evidence-report.ts`/`lib/background-jobs.ts` — todos os erros pré-existentes ficam em `mobile/`,
`prisma/seed-marketplace.ts` e `scripts/migrate-to-multitenant.ts`, fora do escopo desta tarefa.

`generatePendingEvidenceReports` (`lib/background-jobs.ts`) **não é exportada**. Testado assim:
- `reconcileMissingEvidenceReports()` e `generateEvidenceReport()` — chamadas **reais**, diretas, via
  `npx tsx` (são exportadas).
- O passo de promoção/give-up/claim que vive dentro de `generatePendingEvidenceReports` — reproduzido
  com as queries Prisma **copiadas literalmente** do arquivo-fonte (mesmo `where`/`data`) num script de
  teste, em vez de invocar a função como caixa-preta.
- Só 2 chamadas reais de IA no total (cenário 4 e cenário 5).
- Fixtures via `scripts/qa/t066-t2-fixtures.cjs` (clínicas `qa-t066-t2-a`/`-b`). Todos os scripts
  temporários apagados ao final; 0 usuários/triagens residuais confirmado.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Triagem sem relatório → reconciliação cria `GENERATING` | DB direto | ✅ |
| 2 | Paciente já com relatório (`ARCHIVED`) não duplica | DB direto | ✅ |
| 3 | Triagem `isSubmitted: false` nunca gera relatório | DB direto | ✅ |
| 4 | Fluxo completo T-1+T-2: `needsReprocessing` → mesma linha reprocessada | DB + IA real | ✅ |
| 5 | Corrida: documento chega durante `GENERATING` — flag sobrevive à geração | DB + IA real | ✅ |
| 6 | Reivindicação atômica da promoção (2 chamadas concorrentes) | DB direto | ✅ |
| 7 | Teto/volume: 12 órfãos, cap de 10 por chamada | DB direto | ✅ |
| 8 | Isolamento cross-tenant (reconciliação e promoção) | DB direto | ✅ |
| 9 | Regressão: give-up após 3 tentativas + claim condicional | DB direto | ✅ |

## Detalhes

### 1. Triagem sem relatório ✅
1 linha criada, `status: "GENERATING"`, `screeningId`/`clinicId` corretos.

### 2. Não duplica ✅
Relatório existente em `ARCHIVED` (qualquer status já cobre, já que a checagem é "tem QUALQUER
relatório" via `distinct: patientId`) — continua exatamente 1 linha após rodar a reconciliação.

### 3. Ignora rascunho ✅
Triagem `isSubmitted: false` → 0 relatórios criados.

### 4. Fluxo completo T-1+T-2 ✅
Relatório `DRAFT` com `needsReprocessing: true` marcado manualmente → promoção
(`status: GENERATING, needsReprocessing: false, attempts: 0`) → `generateEvidenceReport()` real →
mesmo `id`, `status: DRAFT`, `needsReprocessing: false`, narrativa nova citando `sourceRef` reais
(F6/F3/F4, todos dentro do conjunto válido F1-F6). Nenhuma linha extra criada.

### 5. Corrida documentada — comportamento mais importante desta tarefa ✅
Simulado exatamente o cenário do plano: documento chega enquanto `status: GENERATING`.
- `needsReprocessing: true` marcado com o relatório ainda `GENERATING`.
- Passo de promoção NÃO toca a linha (`status: { not: 'GENERATING' }` protege corretamente).
- `generateEvidenceReport()` real termina a geração → `status: DRAFT`, **`needsReprocessing: true`
  sobrevive** (não foi apagado), exatamente como o JSDoc promete.
- Próximo passo de promoção PEGA a linha corretamente (`status` não é mais `GENERATING`).
- Conclusão: nenhum documento é perdido nessa janela de corrida.

### 6. Reivindicação atômica da promoção ✅
5 relatórios `needsReprocessing: true`, duas chamadas concorrentes (`Promise.all`) do `updateMany`
de promoção: primeira casa `count: 5`, segunda `count: 0` (Postgres serializa, reavalia `WHERE`
depois do lock). Nenhuma linha processada duas vezes.

### 7. Teto/volume ✅
12 triagens órfãs → 1ª chamada cria exatamente 10 (teto respeitado), 2ª chamada cobre as 2
restantes.

### 8. Isolamento cross-tenant ✅
Reconciliação e promoção nunca migram `clinicId` nem tocam relatório da clínica errada.

### 9. Regressão — comportamento antigo do job ✅
Give-up após 3 tentativas intacto. Claim condicional por `attempts` continua protegendo contra
processamento duplo — mudança desta tarefa não afetou esse mecanismo.

## Erros de console
Não aplicável — tarefa sem superfície de UI.

## Falhas e recomendações
Nenhuma falha. Duas notas não-bloqueantes: (1) reconciliação/promoção são globais por design, exigiu
cuidado ao isolar cenários de teste de volume/cross-tenant — não é um problema do código; (2)
`generatePendingEvidenceReports` não é exportada, o que é razoável, mas limita QA futuro a replicar
queries manualmente — sugestão de exportar pra facilitar teste, não bloqueio.

## Critérios de aceite
- [x] Triagem sem relatório ganha `GENERATING` em até 2 min.
- [x] Paciente com relatório em qualquer status nunca ganha um segundo.
- [x] Reconciliação não recria para triagem em rascunho.
- [x] `needsReprocessing: true` é pego e reprocessado, incluindo o comportamento de corrida.
- [x] Dois ciclos não processam a mesma marca duas vezes.
- [x] Volume grande não satura o job.
- [x] Isolamento cross-tenant confirmado.
