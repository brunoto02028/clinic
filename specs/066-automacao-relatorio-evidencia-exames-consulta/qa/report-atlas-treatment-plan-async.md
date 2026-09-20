# QA Report — Atlas Treatment Plan: geração assíncrona (fix do timeout/HTML error)

**Data:** 2026-09-20
**Escopo:** Follow-up direto de bug real achado em sessão de suporte ao vivo em produção (502 do proxy virando "Unexpected token '<'" no frontend). Não há spec formal; reaproveitada a pasta `specs/066-automacao-relatorio-evidencia-exames-consulta/` por conveniência.
**Ambiente:** local (`bpr_clinic_local`), `npm run dev` (porta 4000).
**Resultado geral:** ⚠️ **aprovado com ressalva bloqueante** — a arquitetura assíncrona (POST cria linha → job processa → GET faz polling) está correta e comprovada ponta a ponta pelo *caminho de falha*, mas o **caminho de sucesso (happy path) não pôde ser validado**: a conta OpenRouter está sem créditos (erro 402 em toda chamada, inclusive as de 3000 tokens do chat). Isso não é um bug do código mudado — é um bloqueio de infraestrutura/billing.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Fluxo feliz: `generating` → `ready` com plano real | UI+DB | ⚠️ não executado (OpenRouter sem créditos) |
| 2 | POST responde rápido com `{planId, status}` | API | ✅ |
| 3 | GET — formato em cada estágio (`generating`, `failed`) | API | ✅ (`ready` não executado) |
| 3b | GET com `planId` inexistente → 404 | API | ✅ |
| 3c | POST `generate` com paciente inexistente → 404 | API | ✅ |
| 3d | POST com `action` inválida → 400 | API | ✅ |
| 4 | Isolamento cross-tenant (outra clínica) | API | ✅ 404, sem vazamento |
| 4b | Isolamento mesma clínica, `planId` de outro paciente | API | ✅ 404 "Plan not found" |
| 5 | `action:"chat"` e `atlas-chat` sem regressão | API | ⚠️ parcial — sem HTML crash, conteúdo não validado |
| 6 | Job dá baixa após 3 tentativas presas; cliente para de fazer polling | API+DB+UI | ✅ |
| 7 | Achados de documentos incorporados (sem regressão) | Direto na função | ✅ |
| — | UI "Generating..." e estado de erro | UI | ✅ |
| — | Console do browser sem erros JS | UI | ✅ |
| — | `npx tsc --noEmit -p .` nos arquivos tocados | Build | ✅ zero erros |

## Detalhes

### 1. Fluxo feliz ⚠️ não executado
Toda chamada de geração (6000 tokens) voltou `OpenRouter API error 402: "...You requested up to 6000 tokens, but can only afford 4794..."`. Uma segunda tentativa via `action:"chat"` (3000 tokens) também falhou por 402 pouco depois ("maximum cost exceeds your available credits") — o saldo esgotou durante o QA. Não deu pra validar o parsing do plano nem o card "viewing".

**Recomendação:** recarregar créditos e repetir só este cenário (1 geração completa) antes de fechar o fix.

### 2. POST responde rápido ✅
```
curl -X POST .../atlas-treatment-plan -d '{"action":"generate"}'
→ {"planId":"cmua363pq0001xz0kwdmk7id1","status":"generating"}, HTTP 200, time_total: 1.15s
```

### 3. Polling — formatos por estágio
- `generating`: `{"id":"...","status":"generating","plan":null,"error":null}` ✅
- `failed`: `{"id":"...","status":"failed","plan":null,"error":"OpenRouter API error 402: ..."}` ✅
- `ready`: ⚠️ não observado.
- `planId` inexistente → `{"error":"Plan not found"}` 404 ✅
- Paciente inexistente no POST → `{"error":"Patient not found"}` 404 (bloqueado no `staffPatientAccess`) ✅
- `action` inválida → `{"error":"Invalid action"}` 400 ✅
- Sem sessão → redirect 307 para `/login` ✅

### 4. Isolamento cross-tenant ✅
**a)** Terapeuta de outra clínica (`atlas.qa.other-therapist@example.test`, clínica "QA Clinic A") tentando `GET` o plano de um paciente de "Bruno Physical Rehabilitation" → `{"error":"Patient not found"}`, HTTP 404. Bloqueado no `staffPatientAccess`, sem nem confirmar a existência do paciente.

**b)** Mesma clínica, mas `planId` de outro paciente colado na URL de um segundo paciente → `{"error":"Plan not found"}`, HTTP 404. Confirma o duplo escopo `findFirst({ id: planId, patientId })` em `[planId]/route.ts`.

### 5. `action:"chat"` e `atlas-chat` ⚠️ parcial
Ambos devolveram erro limpo em JSON (500, `{"error":"OpenRouter API error 402: ..."}`), não a página HTML que motivou o fix original — confirma que a extração para `lib/atlas-treatment-plan.ts` não quebrou o wrapping de erro.

**Esclarecimento sobre o brief:** só `atlas-treatment-plan/route.ts` importa `buildPatientContext`/`ATLAS_SYSTEM` de `lib/atlas-treatment-plan.ts`. A rota `atlas-chat/route.ts` (chat livre) tem implementação própria, independente, não tocada por este refactor — não é bug, só o brief descrevendo diferente do código.

Conteúdo de uma resposta bem-sucedida não pôde ser validado (créditos).

### 6. Job de retry/give-up ✅
**a)** Falha real (402): `generateAtlasTreatmentPlan` marca `status:"failed"` imediatamente no catch — `attempts: 1`, erro completo salvo.

**b)** Simulei uma linha presa em `generating` com `attempts: 3` direto no banco. No próximo tick (~15s) do job, o `updateMany({status:"generating", attempts:{gte:3}})` marcou:
```json
{"status":"failed","error":"Generation gave up after repeated failures.","plan":null}
```

**c)** Confirmado na UI: ao chegar em `failed`, o botão volta a "Generate Plan" (não trava em "Generating..." pra sempre).

**Observação (não é bug):** as "3 tentativas" só se aplicam a linhas **presas** em `generating` (ex.: processo reiniciou no meio). Qualquer erro que a função consegue capturar (timeout, 402, JSON malformado) marca `failed` na 1ª tentativa, sem retry automático. Razoável, mas vale o Bruno saber que não é "tenta 3x qualquer falha".

### 7. Achados de documentos — sem regressão ✅
Chamei `buildPatientContext` diretamente (sem gastar créditos) num paciente já existente com `aiSummary` cacheado de QA anterior (atividade 066). A seção "Findings from uploaded exams/referrals/imaging reports:" apareceu corretamente com os 3 achados (GP referral, ultrassom de ombro, artroscopia de joelho). Confirma que a extração preservou a chamada a `loadDocumentFindings`.

## UI
- Estado "Generating...": botão desabilitado, texto "Atlas is analysing all the patient's data and creating the plan...". Screenshot: `atlas-async-generating.png`.
- Estado de erro: botão volta a "Generate Plan", erro do OpenRouter exibido por extenso. Screenshot: `atlas-async-error-state.png`.
- **Observação de UX (não é bug):** o erro exibido é o payload bruto do provider (JSON completo, incluindo `user_id` interno da chave). Funciona pra debug mas é verboso pra tela de admin.

## Console
Zero erros/warnings JS durante todo o fluxo (17 mensagens totais, 0 erros).

## Build
`npx tsc --noEmit -p .` (filtrando `^reconstruir/`): **zero erros** nos 5 arquivos tocados (`lib/atlas-treatment-plan.ts`, as duas rotas `atlas-treatment-plan`, `page.tsx`, `background-jobs.ts`). ~5100 linhas de ruído pré-existente no resto do projeto, como avisado.

## Falhas e recomendações
1. **Bloqueio para fechar o QA:** recarregar créditos OpenRouter e rodar 1 geração completa até `ready`, validando o plano renderizado e o botão "Regenerate". A parte assíncrona (motivo do fix) está comprovadamente correta; o conteúdo final do plano nunca foi visto nesta rodada.
2. Nenhum bug de código encontrado nos cenários executáveis (roteamento, isolamento, erros, retry/give-up).

## Fixtures e limpeza
Fixtures locais (2 terapeutas, 2 pacientes, triagem, 1 SOAP note) e as linhas `AtlasTreatmentPlan` geradas foram todas removidas ao final — confirmado `0` usuários remanescentes com email `atlas.qa*`. Script de fixture removido. Servidor de dev (porta 4000) que eu subi foi encerrado.
