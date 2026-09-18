# T-3: Pipeline de geração do relatório

**Status:** pendente
**Depende de:** T-1, T-2

## Objetivo
A lógica que transforma uma triagem num relatório de evidência estruturado e GDPR-safe.

## Contexto
- Reaproveita agregação/pseudonimização já feitas em `diagnosis/route.ts` e o `callAIClinical`
  (Claude). Catálogo da clínica vem do **banco** (Exercise/ProtocolTemplate), escopado por clínica.

## Passos
1. Criar `lib/evidence-report.ts` com `generateEvidenceReport(reportId)` que:
   - Carrega o report `GENERATING` + a triagem do paciente.
   - **Red-flag gate:** roda `analyzeMedicalScreening` (ou reusa o resultado); se houver red flag →
     grava `redFlag=true` + `redFlagDetails`, **não** gera evidência/sugestões, status `DRAFT`
     com o alerta. Encerra.
   - Sem red flag: monta `caseSummary` (snapshot dos escores/queixa); `buildQueries` →
     `searchLiterature` (T-2), seleciona ~3 SR + ~3 RCT; lê catálogo da clínica do DB
     (escopo `clinicId`); pseudonimiza (`lib/pseudonymize`); chama `callAIClinical` com prompt
     que exige rastreabilidade fonte→sugestão e separação disponível/fora-do-catálogo.
   - Faz parse robusto do JSON (reusar o repair do protocol route) → grava `evidence`,
     `clinicCrossRef`, `suggestions`, `gaps`, `narrativeEn`, `aiModel`/tokens; status `DRAFT`.
   - Em erro: grava `error` e status `DRAFT` (com aviso), sem derrubar o job.
2. Garantir provider Claude/`AI_STRICT_MODE` no contexto clínico.

## Arquivos afetados
- `lib/evidence-report.ts` (novo)

## Critérios de aceite
- [ ] Caso normal: gera evidência + cruzamento + sugestões rastreáveis, status `DRAFT`.
- [ ] Caso red-flag: interrompe, grava alerta, sem sugestões.
- [ ] Pseudonimização aplicada; sem PII à Europe PMC; provider Claude.
- [ ] Erro de IA/rede não derruba o processo (grava `error`).
