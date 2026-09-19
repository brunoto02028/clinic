# Atividade 065 — Correção do gate de red flag da automação de relatório clínico

## Objetivo

A automação `ClinicalEvidenceReport` (atividade 15) gera relatório de evidência científica
automaticamente quando um paciente submete a triagem (`MedicalScreening`). Ela já tem um gate de
segurança: se algum "red flag urgente" for detectado, o pipeline deve parar antes de buscar
literatura e gerar sugestão de tratamento, deixando só um alerta pra avaliação humana prioritária.

Enquanto analisava manualmente a ficha de uma paciente (Mione De Almeida, 78 anos) a pedido do
Bruno — ela relatou falta de ar e palpitação na triagem — encontrei que esse gate **não parava**
pra sintoma cardiovascular isolado: `cardiovascularSymptoms` era classificado como `urgencyLevel:
'high'`, e o gate só interrompe o pipeline quando existe um flag `'urgent'`. Isso significa que
qualquer paciente reportando só falta de ar/dor torácica/arritmia (sem perda de peso inexplicada,
sem disfunção de esfíncter, ou sem a combinação específica dor noturna+câncer) tinha o pipeline
seguindo normalmente e gerando sugestão de tratamento — contrariando a política de segurança do
projeto (mesmo critério usado pela skill `clinical-evidence-report`, que trata "dor torácica, falta
de ar ou sinais sugestivos de causa não musculoesquelética" como parada obrigatória).

Achei também, no mesmo relatório, um segundo bug: quando a resposta da IA não vinha em JSON válido,
o erro de parse era engolido em silêncio (`catch { parsed = {} }`) — o relatório ficava com
`status: DRAFT`, `error: null`, indistinguível de um sucesso real, mas sem narrativa/sugestão
nenhuma.

## Achados e correção

1. **Gate de red flag cardiovascular não parava o pipeline** (`lib/clinical-analysis.ts`,
   `assessRedFlags`) — `cardiovascularSymptoms` mudado de `urgencyLevel: 'high'` pra
   `urgencyLevel: 'urgent'`, igual às outras categorias que já são paradas garantidas
   (`unexplainedWeightLoss`, `bladderBowelDysfunction`). Consequência: `redFlagAssessment.status`
   agora vira `'urgent_red_flags'` sempre que há sintoma cardiovascular, e
   `lib/evidence-report.ts`'s gate (`if (flags.status === "urgent_red_flags")`) para o pipeline
   antes de buscar literatura ou gerar sugestão — igual já acontecia pra perda de peso
   inexplicada/disfunção de esfíncter.
2. **Falha de parse da resposta da IA era silenciosa** (`lib/evidence-report.ts`,
   `generateEvidenceReport`) — agora grava uma mensagem em `error` (`"AI response was not valid
   JSON: ..."`) em vez de deixar o relatório com `error: null` como se tivesse funcionado.

## Validação já feita (sessão principal, antes de QA formal)

Deploy em produção (commit `111390b9`), depois os dois relatórios reais já afetados foram
reprocessados contra a lógica corrigida:
- **Mione De Almeida** (sintoma cardiovascular real): relatório reprocessado →
  `redFlag: true`, `evidence: []`, `suggestions: null`, narrativa de alerta correta. Confirma que o
  gate agora funciona pro caso real que motivou a correção.
- **Ana Livia Pessin Prata** (relatório antigo travado com "No screening linked to this report",
  problema de dado não relacionado a este fix): reprocessado com sucesso, `redFlag: false`,
  evidência e sugestão geradas normalmente, sem erro — confirma que a correção não quebrou o
  caminho normal (sem red flag urgente).

## Decisões de design

- **Nenhuma mudança de schema** — o enum `DiagnosisStatus` e os campos de `ClinicalEvidenceReport`
  já suportavam esse fluxo; só a classificação de urgência do sintoma cardiovascular mudou.
- **Nenhuma mudança de UI** — `components/admin/evidence-report-tab.tsx` já renderiza
  corretamente `redFlag: true` (banner vermelho, sem seção de evidência/sugestão) vs. `false`
  (banner verde + lista de precauções); só passou a receber o valor certo pro caso cardiovascular.
- **Sem envio automático a paciente** — confirmado que este pipeline nunca teve e continua sem
  ter uma transição `SENT_TO_PATIENT`; é clinician-internal (`DRAFT → UNDER_REVIEW → APPROVED`),
  conforme reforçado pelo Bruno (regra geral, ver memória `feedback_no-automatic-patient-sends.md`).

## Fora de escopo (observado, não tocado nesta atividade)

- `determineUrgencyLevel` (função separada, usada só pro campo informativo `caseSummary.urgency`
  mostrado ao terapeuta) ainda só marca `cardiovascularSymptoms` como `'urgent'` quando combinado
  com `nightPain` — é um rótulo informativo, não um gate de segurança, mas vale revisar numa
  iteração futura se quiser manter os dois sinais consistentes.
- Escrita de campos com `?? undefined` em `generateEvidenceReport` (`clinicCrossRef`, `suggestions`,
  `gaps`) não limpa conteúdo antigo num reprocessamento — Prisma trata `undefined` como "não mudar".
  Não afetou os dois casos reais testados (ambos eram relatórios com esses campos já vazios), mas é
  uma pegadinha latente se um relatório já aprovado com sugestão for regenerado e a nova rodada
  falhar o parse — ficaria com sugestão antiga + erro novo, silenciosamente misturados.

## QA e code review

QA (agente qa-tester): 7/7 cenários aprovados — flags cardiovascular/neurológico isolados param o
pipeline corretamente, categorias já `urgent` antes desta mudança continuam parando (sem
regressão), caminho feliz sem red flag continua gerando evidência/sugestão normalmente, falha de
parse da IA (inclusive JSON válido mas vazio) grava erro visível, isolamento cross-tenant
confirmado, nenhum caminho de envio automático ao paciente. Os dois relatórios reais reprocessados
em produção (Mione De Almeida, Ana Livia Pessin Prata) batem com o esperado. `qa/report-t-1.md`.

Code review: achou 2 lacunas reais da mesma família do bug original, ambas corrigidas antes do
deploy final — `neurologicalSymptoms` tinha o mesmo problema do cardiovascular (`'high'` nunca para
o pipeline sozinho); e resposta da IA que é JSON válido mas semanticamente vazia (`{}` ou
truncamento) não acionava o registro de erro adicionado no fix original. Ver detalhes em
`t-1-fix-gate-cardiovascular.md`.

Deployado em produção em duas etapas: commit `111390b9` (fix original: cardiovascular + silêncio no
parse) e commit `8fd30c34` (achados do code review: neurológico + JSON vazio). Ambos confirmados no
ar (`curl` 200).

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Corrigir gate de red flag cardiovascular + silêncio no erro de parse | concluído |
