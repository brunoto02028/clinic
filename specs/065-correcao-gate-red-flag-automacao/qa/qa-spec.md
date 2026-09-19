# QA Spec — Atividade 065: correção do gate de red flag cardiovascular

## T-1 — Cenários

Todos via API/DB (fixtures de `MedicalScreening` + `ClinicalEvidenceReport`), não precisa de UI —
o comportamento a validar é do pipeline de geração (`lib/evidence-report.ts` +
`lib/clinical-analysis.ts`), chamado pelo job em background `generatePendingEvidenceReports`
(`lib/background-jobs.ts`).

1. **Cardiovascular isolado para o pipeline** — fixture de screening com
   `cardiovascularSymptoms: true` e todos os outros red flags `false`. Criar/resetar um
   `ClinicalEvidenceReport` pra `GENERATING` vinculado a essa screening, deixar o job processar (ou
   chamar `generateEvidenceReport` diretamente). Esperado: `redFlag: true`, `status: 'DRAFT'`,
   `evidence: []`, `suggestions: null`/`undefined`, `clinicCrossRef` vazio, narrativa de alerta
   presente, `redFlagDetails` contém o item "Cardiovascular Symptoms" com `urgencyLevel: 'urgent'`.
2. **Combinação com outro flag moderado não muda o resultado** — `cardiovascularSymptoms: true` +
   `traumaHistory: true` (caso real da Mione). Mesmo resultado do cenário 1, `redFlagDetails` com
   os dois flags.
3. **Caminho feliz sem regressão** — screening sem nenhum red flag `urgent` (pode ter
   `traumaHistory`/`dizzinessBalanceIssues`/outros `moderate`/`high`, mas nenhum que já era
   `urgent` antes desta mudança). Esperado: `redFlag: false`, evidência buscada, `suggestions`
   preenchido (ou pelo menos tentativa real — pode falhar por motivo externo tipo rede/IA, mas não
   por causa do gate), narrativa não é a mensagem de alerta.
4. **Regressão das categorias já `urgent` antes desta mudança** — `unexplainedWeightLoss: true` (ou
   `bladderBowelDysfunction: true`, ou `nightPain: true` + `cancerHistory: true`) sem
   `cardiovascularSymptoms`. Esperado: continuam parando o pipeline exatamente como antes
   (`redFlag: true`), comportamento inalterado por esta mudança.
5. **Falha de parse da IA não fica silenciosa** — forçar (via mock/stub de `callAIClinical`, ou um
   caso real observável) uma resposta que não é JSON válido, num screening SEM red flag urgente
   (pra realmente chegar no passo de síntese). Esperado: `status: 'DRAFT'`, `error` preenchido com
   mensagem clara ("AI response was not valid JSON..."), não `error: null`.
6. **Isolamento cross-tenant** — os relatórios gerados/reprocessados nunca cruzam `clinicId`; a
   função `loadClinicCatalog(clinicId)` só traz exercícios/protocolos da própria clínica do
   relatório.
7. **Regressão dos dois casos reais já reprocessados em produção** (evidência já coletada pela
   sessão principal, revalidar): relatório da Mione De Almeida (`cmu8vb148000tnw088dy2v7i4`) e da
   Ana Livia Pessin Prata (`cmu4lf7260001ql0801658aiz`) — conferir que o estado atual no banco de
   produção bate com o esperado dos cenários 1 e 3 respectivamente.

## Observações de segurança pro QA
- Não é preciso (nem desejável) chamar a API real da Claude/Europe PMC repetidamente — priorize
  fixtures onde o resultado é determinístico (`assessRedFlags` é uma função pura, testável sem
  chamada externa). Reserve chamadas reais só pro cenário 3 (caminho feliz) e, se necessário, pra
  revalidar os dois casos reais do cenário 7 — sempre em `AI_STRICT_MODE` respeitando a config já
  presente no ambiente.
- Limpe qualquer fixture de screening/relatório criada especificamente para este QA ao final —
  não mexer nos dois relatórios reais (Mione/Ana Livia) além de conferir seu estado atual.
