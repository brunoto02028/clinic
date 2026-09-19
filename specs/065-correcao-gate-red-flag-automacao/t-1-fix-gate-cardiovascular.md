# T-1: Corrigir gate de red flag cardiovascular + silêncio no erro de parse

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Sintoma cardiovascular isolado (falta de ar, dor torácica, arritmia) deve parar o pipeline
automático de relatório de evidência clínica antes de buscar literatura/sugerir tratamento — igual
já acontece pra perda de peso inexplicada e disfunção de esfíncter. E uma falha de parse da IA não
deve mais ficar indistinguível de um sucesso vazio.

## Contexto
Ver `plan.md`. Achado durante análise manual da ficha da paciente Mione De Almeida (triagem real,
relatório automático já gerado em produção antes desta correção).

## Passos
1. `lib/clinical-analysis.ts`, `assessRedFlags` — `cardiovascularSymptoms` de `urgencyLevel: 'high'`
   pra `urgencyLevel: 'urgent'`.
2. `lib/evidence-report.ts`, `generateEvidenceReport` — falha de `parseAIJson` agora grava `error`
   em vez de silenciosamente virar `{}`.
3. Deploy em produção (commit `111390b9`).
4. Reprocessar os dois relatórios reais já afetados (Mione — caso que motivou a correção; Ana Livia
   — relatório antigo travado por outro motivo, usado como checagem de regressão do caminho normal).

## Arquivos afetados
- `lib/clinical-analysis.ts`
- `lib/evidence-report.ts`

## Critérios de aceite
- [x] Paciente com `cardiovascularSymptoms: true` (e nenhum outro red flag `urgent`) faz o
      relatório parar (`redFlag: true`, `evidence: []`, `suggestions: null`, narrativa de alerta),
      não gerar sugestão de tratamento.
- [x] Paciente sem nenhum red flag `urgent` continua gerando evidência/sugestão normalmente
      (nenhuma regressão no caminho feliz).
- [x] Outras categorias de red flag urgente (perda de peso inexplicada, disfunção de
      esfíncter, dor noturna+câncer) continuam parando o pipeline como antes.
- [x] Falha de parse da resposta da IA grava uma mensagem em `error`, nunca fica `error: null` com
      conteúdo vazio como se tivesse funcionado.
- [x] Isolamento cross-tenant: geração/reprocessamento de relatório de uma clínica nunca toca
      dado de outra clínica.

## Code review — achados adicionais, corrigidos

O code review sobre a correção original encontrou mais duas lacunas da mesma família:

1. **`neurologicalSymptoms` tinha o mesmo problema do cardiovascular** — `urgencyLevel: 'high'`,
   nunca para o pipeline sozinho. `red-flags.md` trata déficit neurológico progressivo como
   categoria de parada obrigatória, e o campo de triagem não distingue "progressivo" de
   "estável/crônico" — não dá pra confiar que só a combinação com disfunção de esfíncter (que já é
   `urgent` via `bladderBowelDysfunction`) cobre o risco. Corrigido: `neurologicalSymptoms` agora
   também é `urgencyLevel: 'urgent'`.
2. **Resposta da IA que é JSON válido mas semanticamente vazia** (ex. `{}`, ou truncamento por
   `maxTokens` que fecha as chaves antes de preencher os campos) não lançava exceção no parse —
   `error` continuava `null`, e a tela de review (`evidence-report-tab.tsx`) só desabilita
   "mark review"/"approve" quando `error` é truthy. Um clínico podia aprovar um relatório em
   branco sem nenhum sinal visível. Corrigido: depois do parse, se `narrative`/`suggestions`/
   `clinicCrossRef` vierem todos vazios, `error` é preenchido mesmo sem exceção de parse.

Nenhum outro problema encontrado (corrida no job, cross-tenant, ou regressão nas duas linhas
originais da correção) — ver relatório completo na conversa da atividade.
