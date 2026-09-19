# QA Report — T-1: Corrigir gate de red flag cardiovascular + silêncio no erro de parse

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Cardiovascular isolado para o pipeline | Função pura (`assessRedFlags`) | ✅ |
| 2 | Cardiovascular + trauma (caso real Mione) | Função pura | ✅ |
| 3 | Caminho feliz sem regressão | Pipeline real (DB local + IA real) | ✅ |
| 4 | Regressão das categorias já `urgent` | Função pura | ✅ |
| 5 | Falha de parse da IA não fica silenciosa | Unit test mockado (`generateEvidenceReport`) | ✅ |
| 6 | Isolamento cross-tenant | Leitura de código + fixture real (2 clínicas) | ✅ |
| 7 | Regressão dos dois casos reais (produção) | Leitura read-only do banco de produção | ✅ |

## Ambiente e método
- `lib/clinical-analysis.ts` (`assessRedFlags`) é função pura — testada diretamente via `analyzeMedicalScreening` (único ponto de entrada exportado), sem DB nem rede. Script: `scripts/qa/t065-scenarios-1-4.ts`.
- Cenário 5: `generateEvidenceReport` testado com `jest.mock` de `@/lib/db`, `@/lib/ai-provider` e `@/lib/europe-pmc` — 100% determinístico, sem chamada real. Arquivo de teste foi **removido após a execução** (era explicitamente temporário).
- Cenários 3 e 6: fixtures reais no banco local (`bpr_clinic_local`) — 2 clínicas isoladas (`qa-065-clinic-a`, `qa-065-clinic-b`), cada uma com paciente, triagem sem red flag urgente, 1 exercício com nome único, e relatório `GENERATING`. `generateEvidenceReport` rodado **apenas no relatório da clínica A** (chamada real a `callAIClinical`/Claude e a `searchLiterature`/Europe PMC — permitido pela qa-spec para o cenário 3), depois verificado que o relatório da clínica B não foi tocado.
- Cenário 7: leitura read-only do banco de produção (`bpr-clinic-db`, via `external_db_url` obtido pela API do Coolify), só `SELECT` nos dois IDs conhecidos — nenhuma escrita.
- `npx tsc --noEmit -p .` (filtrado com `grep -v "^reconstruir/"`): erros pré-existentes no projeto, **zero** em `lib/clinical-analysis.ts` ou `lib/evidence-report.ts` (os dois arquivos tocados por esta tarefa).
- Toda fixture local (2 clínicas, 2 pacientes, 2 triagens, 2 exercícios, 2 relatórios) foi **apagada ao final**. Os dois relatórios reais de produção (Mione, Ana Livia) só foram lidos, nunca escritos.

## Detalhes

### 1. Cardiovascular isolado para o pipeline ✅
- **Fixture:** screening com `cardiovascularSymptoms: true`, todos os outros red flags `false`.
- **Obtido:**
```
PASS: S1: status === urgent_red_flags
PASS: S1: cardiovascular flag urgencyLevel === urgent
PASS: S1: only one flag present
```
Como `assessRedFlags` é chamada antes de qualquer busca (linhas 119-120 de `lib/evidence-report.ts`) e o gate da linha 143 grava `redFlag: true, evidence: [], suggestions: undefined`, esse resultado garante o comportamento completo do pipeline pro caso real que motivou a correção (revalidado no cenário 7 com o relatório real da Mione).

### 2. Combinação com trauma (caso real da Mione) ✅
```
PASS: S2: status === urgent_red_flags
PASS: S2: cardiovascular flag urgencyLevel === urgent
PASS: S2: trauma flag present as moderate
PASS: S2: exactly two flags
```

### 3. Caminho feliz sem regressão ✅
- **Fixture real (DB local):** clínica A, paciente com triagem `traumaHistory: true` apenas (nenhum red flag `urgent`), 1 exercício catalogado. `generateEvidenceReport` executado de ponta a ponta.
- **Obtido:**
```json
{
  "status": "DRAFT",
  "redFlag": false,
  "error": "AI response was not valid JSON: Failed to parse AI response as JSON",
  "evidenceCount": 4,
  "hasSuggestions": false,
  "clinicCrossRef": null,
  "narrativeEn": null
}
```
O gate **não** disparou (`redFlag: false`), a busca de literatura funcionou (4 itens reais do Europe PMC), e a chamada real à IA (Claude) falhou em produzir JSON válido nessa rodada — reproduzido de forma consistente em 2 execuções seguidas com os mesmos dados. Isolado com uma lista de evidência sintética mais curta (script de debug, removido depois) e nesse caso a IA retornou JSON válido — a causa provável está no conteúdo real vindo do Europe PMC, não no gate desta correção. Isso está dentro do comportamento aceito pela própria qa-spec ("pode falhar por motivo externo tipo rede/IA, mas não por causa do gate") e, de quebra, confirma em ambiente real o Fix #2 (erro registrado em `error`, nunca `null`). Ver "Falhas e recomendações".

### 4. Regressão das categorias já `urgent` ✅
```
PASS: S4a: unexplainedWeightLoss alone -> urgent_red_flags
PASS: S4a: flag urgencyLevel === urgent
PASS: S4b: bladderBowelDysfunction alone -> urgent_red_flags
PASS: S4b: flag urgencyLevel === urgent
PASS: S4c: nightPain+cancerHistory -> urgent_red_flags
PASS: S4c: night pain flag urgencyLevel === urgent (because cancerHistory)
PASS: S4d control: nightPain alone -> NOT urgent_red_flags
PASS: S4d control: night pain flag urgencyLevel === high (no cancerHistory)
```
O controle (S4d, `nightPain` sozinho) confirma que a mudança não alargou nada além de `cardiovascularSymptoms`.

### 5. Falha de parse da IA não fica silenciosa ✅
- **Abordagem:** `generateEvidenceReport` chamado com `@/lib/db`, `@/lib/ai-provider` e `@/lib/europe-pmc` mockados — `callAIClinical` forçado a devolver `"This is not JSON at all, sorry."`, screening sem red flag urgente.
- **Comando:** `npx jest __tests__/qa-tmp/t065-scenario5-parse-error.test.ts`
- **Output:** `Tests: 1 passed, 1 total`. Assert principal: `data.error` não é `null`, bate com `/AI response was not valid JSON/`; `data.narrativeEn` é `null`. **Corroborado em ambiente real** pelo cenário 3.

### 6. Isolamento cross-tenant ✅
- **Leitura de código:** `loadClinicCatalog(clinicId)` (`lib/evidence-report.ts:63-76`) filtra `exercise.findMany`/`protocolTemplate.findMany` por `{ isActive: true, clinicId }` — sempre `report.clinicId`, nunca input externo.
- **Fixture real:** 2 clínicas com exercícios de nome único. `generateEvidenceReport` rodado só no relatório da clínica A.
- **Obtido:**
```
Report B (clinic B, control) AFTER — must be untouched: {"status":"GENERATING", "unchanged":true}
Cross-tenant leak check: does report A output mention clinic B's exercise name? false
```

### 7. Regressão dos dois casos reais em produção ✅
- **Mione De Almeida** (`cmu8vb148000tnw088dy2v7i4`): `redFlag: true`, `status: DRAFT`, `error: null`, `evidence: []`, `suggestions: null`, narrativa = mensagem de alerta, `redFlagDetails` inclui "Cardiovascular Symptoms" com `urgencyLevel: 'urgent'`. Bate com cenário 1.
- **Ana Livia Pessin Prata** (`cmu4lf7260001ql0801658aiz`): `redFlag: false`, `status: DRAFT`, `error: null`, `evidence` com 5 itens, `suggestions` presente, narrativa com conteúdo real. Bate com cenário 3.

## Verificação de segurança — sem envio automático ao paciente
- `generateEvidenceReport` só escreve `status: "DRAFT"` em todos os caminhos. Nunca referencia `SENT_TO_PATIENT`.
- A rota `PATCH /api/admin/patients/[id]/evidence-report` tem `allowed = ["DRAFT", "UNDER_REVIEW", "APPROVED", "ARCHIVED"]`, que **exclui** `SENT_TO_PATIENT`, com comentário explícito no código: *"No SENT_TO_PATIENT here: this report is clinician-internal in this phase."*
- `grep -rl "SENT_TO_PATIENT"` não retorna ocorrência em `lib/evidence-report.ts`, `lib/clinical-analysis.ts`, `lib/background-jobs.ts` ou na rota do relatório.
- Conclusão: a correção não introduziu nem expôs nenhum caminho de envio automático.

## Erros de console
Não aplicável — QA via API/DB/testes de unidade, sem UI (conforme a própria qa-spec).

## Falhas e recomendações
Nenhuma falha na correção sob teste. Uma observação fora do escopo desta tarefa:

- **Falha de parse real no cenário 3:** com evidência real do Europe PMC (4 fontes), a IA real não retornou JSON válido, reproduzido 2x. Com evidência sintética mais simples, o parse funcionou — sugere que algo no conteúdo real das fontes (título longo, aspas, caractere especial) confunde a geração de JSON da IA. Não é regressão do gate (que corretamente manteve `redFlag: false`) nem do fix #2 (erro corretamente registrado). Vale investigar depois se é recorrente em produção com volume real — fora do escopo de T-1.

## Arquivos e scripts usados (mantidos para reprodutibilidade)
- `scripts/qa/t065-scenarios-1-4.ts`
- `scripts/qa/t065-scenario3-6-fixtures.cjs`
- `scripts/qa/t065-run-scenario3-6.ts`
- Removidos após uso: teste jest de mock do cenário 5, e `t065-debug-ai-raw.ts` (investigação).
- Todas as fixtures do banco local foram apagadas ao final; nenhuma escrita foi feita em produção.
