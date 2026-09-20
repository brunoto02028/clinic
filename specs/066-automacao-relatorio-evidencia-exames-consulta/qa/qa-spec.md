# QA Spec — Atividade 066: automação completa do relatório de evidência

## T-1 — Ingestão de exames/documentos + reabertura automática

0. **Reabertura por documento novo — os 3 casos da Decisão 0**:
   - Paciente sem relatório: subir documento relevante cria `ClinicalEvidenceReport` novo.
   - Paciente com relatório `DRAFT`/`UNDER_REVIEW`: subir documento marca o MESMO relatório
     (`needsReprocessing: true`), confirmar que não aparece uma linha nova na tela.
   - Paciente com relatório `APPROVED`: subir documento cria uma VERSÃO NOVA; a aprovada continua
     intacta (mesmo `id`, mesmo conteúdo, `approvedAt`/`reviewedById` inalterados) e visível no
     histórico da tela.
0b. **Rajada de uploads** — subir 3+ documentos em sequência rápida pro mesmo paciente (relatório
   não aprovado); confirmar que só UMA regeneração acontece (não uma por documento) e que todos os
   documentos entram na análise final.
0c. **Documento não-clínico não dispara nada** — subir um `CONSENT_FORM`/`INSURANCE` não marca
   `needsReprocessing` nem cria relatório novo.

1. **Documento relevante sem `extractedText`** — paciente com um `PatientDocument` tipo `IMAGING`
   (PDF real de exame, sem dado sensível — sintético é aceitável) sem `extractedText`. Gerar o
   relatório extrai o texto (chama o Docling de verdade, confirma custo baixo/aceitável), grava em
   `PatientDocument.extractedText`, e o achado aparece no `caseSummary`/influencia a busca de
   literatura (confirmar via `evidence` retornado — termos do achado batendo com o que foi
   buscado).
2. **Documento já com `extractedText`** — regenerar o relatório do mesmo paciente não chama o
   Docling de novo pro mesmo documento (confirmar via contagem de chamadas, ou timestamp de
   `updatedAt` do documento não mudando).
3. **Documento não-clínico** (`INSURANCE`/`CONSENT_FORM`) — nunca entra na análise, mesmo que tenha
   `extractedText` preenchido por outro motivo.
4. **Falha do Docling num documento** — simular indisponibilidade (mock, ou um arquivo corrompido
   de propósito) e confirmar que o relatório é gerado normalmente com o resto (triagem + outros
   documentos), sem travar em `GENERATING`/`FAILED`.
5. **Base científica preservada** — toda sugestão que referencia achado de exame ainda tem
   `sourceRef` válido apontando pra uma fonte real da lista de evidência — nunca aparece afirmação
   sem fonte, mesmo vinda de um achado de imagem.
6. **Isolamento cross-tenant** — documento de outro paciente/clínica nunca entra na análise de um
   relatório.

## T-2 — Reconciliação automática

1. **Triagem sem relatório** — apagar (ou simular) a ausência de `ClinicalEvidenceReport` pra uma
   triagem `isSubmitted: true` já existente; confirmar que o próximo ciclo do job cria a linha
   `GENERATING` automaticamente, sem ação manual.
2. **Não duplica** — paciente que já tem relatório (qualquer status) nunca ganha um segundo pela
   reconciliação.
3. **Ignora rascunho** — triagem `isSubmitted: false` (autosave) nunca gera relatório pela
   reconciliação.
4. **Volume/teto** — se houver um teto por ciclo, confirmar que ele é respeitado com um volume
   maior de triagens pendentes simultâneas; se não houver teto, confirmar que a decisão de não ter
   um está documentada e justificada.
5. **Isolamento cross-tenant** — reconciliação nunca cria relatório vinculado à clínica errada.

## T-3 — Bilíngue na criação (só se implementado)

1. Relatório novo já nasce com PT completo (resumo+sugestões+lacunas), sem precisar trocar o
   toggle.
2. Trocar o toggle pra PT num relatório recém-criado não dispara nova chamada de IA (idempotente,
   já veio pronto).
3. Se a Suposição 2 foi respondida como "continuar sob demanda" — confirmar que T-3 não alterou
   nenhum comportamento (regressão do que já existia da atividade 065).

## T-4 — Observação do fisioterapeuta + link com SOAP

1. **Editar observação** — escrever/salvar uma observação no relatório; recarregar a tela e
   confirmar que persiste, sem apagar nada do conteúdo da IA.
2. **Separação visual** — confirmar (screenshot) que a observação do fisioterapeuta é claramente
   distinta do conteúdo gerado pela IA.
3. **Link SOAP → relatório** — criar/editar uma nota SOAP associada a um paciente com relatório de
   evidência existente; confirmar que dá pra navegar do SOAP pro relatório.
4. **Isolamento cross-tenant** — observação de um relatório nunca edita/vaza pra relatório de outro
   paciente.
5. **Sem envio automático ao paciente** — confirmar, como em toda tarefa desta atividade, que
   nenhuma mudança introduziu um caminho pra `SENT_TO_PATIENT` ou qualquer notificação automática.

## Observações gerais pro QA desta atividade
- Toda tarefa que mexe em `generateEvidenceReport`/`lib/evidence-report.ts` deve reconfirmar as
  regressões já cobertas nas atividades 065 T-1/T-2 (gate de red flag, tradução completa,
  isolamento cross-tenant) — não é pra reexecutar tudo do zero, mas um smoke test rápido de que
  nada quebrou é esperado em cada QA desta atividade.
- Nenhum teste desta atividade deve gerar envio real pro paciente, nem depender de
  `AI_STRICT_MODE` desligado sem confirmar antes o estado real do ambiente.
