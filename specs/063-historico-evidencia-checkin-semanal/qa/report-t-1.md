# QA Report - T-1: Historico de relatorios de evidencia clinica

**Data:** 19/09/2026
**Resultado geral:** APROVADO
**Ambiente:** local (Next dev :4210, banco local, fixtures via `scripts/qa/tenant-fixtures.cjs` + `scripts/qa/t063-evidence-history-fixtures.cjs`)
**Executado por:** agente qa-tester

## Resumo

| # | Cenario | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Happy path - GET ?history=true com 3 relatorios, ordenados createdAt desc | API | OK |
| 2 | Compatibilidade - GET sem ?history=true continua devolvendo { report } (so o mais recente) | API | OK |
| 3 | Paciente sem relatorio - ?history=true devolve { reports: [] }, sem erro | API | OK |
| 4a | Sem sessao -> redirect para /login | API | OK |
| 4b | Sessao de paciente (role PATIENT) -> 403 Forbidden | API | OK |
| 4c | Staff de outra clinica pedindo historico de paciente de outra clinica -> 404 | API | OK |
| 5 | PATCH em item nao-mais-recente (o mais antigo) -> so aquele item muda, os outros ficam intactos | API | OK |
| 6 | Timeline visivel com 3+ relatorios, ordenada do mais recente pro mais antigo, badges/datas corretos | UI | OK |
| 7 | Mais recente expandido por padrao; anteriores colapsados sob "Earlier reports" | UI | OK |
| 8 | Mark under review/Approve num item antigo da timeline -> badge atualiza sem afetar outros itens, sem reload | UI | OK |
| 9 | Paciente com 1 relatorio so -> mesma UI de sempre, sem "Earlier reports", sem quebra visual | UI | OK |
| 10 | Paciente sem relatorio -> estado vazio ("No evidence report yet." + botao "Generate report"), sem erro/spinner infinito | UI | OK |
| 11 | Cross-tenant: staff de outra clinica nao ve o paciente/historico (bloqueado ja na pagina do paciente, "Patient not found") | UI | OK |

Todos os 11 cenarios da qa-spec (API 1-5, UI 6-11) foram cobertos, nenhum derivado foi necessario.

## Fixtures usadas

Reaproveitei scripts/qa/tenant-fixtures.cjs (clinica A "qa-clinic-a" / clinica B "qa-studio-pt", staff qa.admina/qa.trainer, senha QaTenant#2026) e criei scripts/qa/t063-evidence-history-fixtures.cjs (mantido no repo, reexecutavel) que:
- adiciona 3 ClinicalEvidenceReport a qa.pacientea@example.test (clinica A) com createdAt espacados (30 Aug / 09 Sept / 18 Sept) e status ARCHIVED / DRAFT / APPROVED;
- cria qa.evidence.onereport@example.test (clinica A) com exatamente 1 relatorio;
- cria/limpa qa.evidence.noreport@example.test (clinica A) sem relatorios.

Nota sobre a fixture "noreport": essa conta ja existia no banco local (de uso manual anterior, fora deste script) com um ClinicalEvidenceReport real gerado por IA, gravado sob um clinicId diferente do da clinica A. Meu primeiro resetReports filtrava por clinicId + patientId e nao apagou esse registro orfao (clinicId divergente), entao o cenario 3 inicialmente falhou (devolveu 1 relatorio em vez de []). Corrigi o script para filtrar so por patientId e reexecutei - reportado aqui como transparencia sobre a fixture, nao e um bug do codigo sob teste.

## Detalhes

### 1. Happy path - multiplos relatorios OK
```
$ curl -s -i -b admina.jar "http://localhost:4210/api/admin/patients/<pacienteA>/evidence-report?history=true"
HTTP/1.1 200 OK
{"reports":[
  {"id":"...jk...","status":"APPROVED","createdAt":"2026-09-18T10:51:28.063Z", ...},
  {"id":"...jj...","status":"DRAFT","createdAt":"2026-09-09T10:51:28.062Z", ...},
  {"id":"...jf...","status":"ARCHIVED","createdAt":"2026-08-30T10:51:28.059Z", ...}
]}
```
3 relatorios, ordem createdAt desc confirmada (18 Sept -> 09 Sept -> 30 Aug).

### 2. Compatibilidade - sem ?history=true OK
```
$ curl -s -i -b admina.jar "http://localhost:4210/api/admin/patients/<pacienteA>/evidence-report"
HTTP/1.1 200 OK
{"report":{"id":"...jk...","status":"APPROVED", ...}}
```
So o mais recente, formato { report } inalterado.

### 3. Paciente sem relatorio OK
```
$ curl -s -i -b admina.jar "http://localhost:4210/api/admin/patients/<noreport>/evidence-report?history=true"
HTTP/1.1 200 OK
{"reports":[]}
$ curl -s -i -b admina.jar "http://localhost:4210/api/admin/patients/<noreport>/evidence-report"
HTTP/1.1 200 OK
{"report":null}
```
200 em ambos, nunca erro.

### 4. Auth OK
```
### 4a. Sem sessao
$ curl -s -i "http://localhost:4210/api/admin/patients/<pacienteA>/evidence-report?history=true"
HTTP/1.1 307 Temporary Redirect
location: /login?callbackUrl=...

### 4b. Sessao de paciente (role PATIENT) no proprio registro
$ curl -s -i -b pacientea.jar "http://localhost:4210/api/admin/patients/<pacienteA>/evidence-report?history=true"
HTTP/1.1 403 Forbidden
{"error":"Forbidden"}

### 4c. Staff de outra clinica (qa.trainer, clinica B) pedindo historico de paciente da clinica A
$ curl -s -i -b trainerb.jar "http://localhost:4210/api/admin/patients/<pacienteA>/evidence-report?history=true"
HTTP/1.1 404 Not Found
{"error":"Not found"}
```
Confirmei que o 404 cross-tenant e identico com e sem ?history=true (mesma chamada sem o parametro devolveu o mesmo 404 {"error":"Not found"}) - nenhuma regressao no comportamento de staffPatientAccess.

### 5. PATCH em item nao-mais-recente OK
```
$ curl -s -i -b admina.jar -X PATCH ".../evidence-report" -H "Content-Type: application/json" -d "{\"reportId\":\"<id do ARCHIVED, mais antigo>\",\"status\":\"APPROVED\"}"
HTTP/1.1 200 OK
{"report":{"id":"...","status":"APPROVED","reviewedById":"<adminA>","approvedAt":"2026-09-19T10:52:25.180Z", ...}}
```
Conferido no historico logo depois: so o item PATCHado mudou (status, reviewedById, approvedAt preenchidos); o DRAFT do meio e o APPROVED mais recente ficaram com seus valores originais intocados. Fixtures foram re-seedadas depois para restaurar o estado ARCHIVED/DRAFT/APPROVED limpo antes dos testes de UI.

### 6-7. Timeline com historico completo, mais recente expandido OK
Login como qa.admina@example.test (staff ADMIN da clinica A) via /staff-login. Ficha do paciente qa.pacientea, aba "Evidence":
- Relatorio de 18 Sept (APPROVED) aparece expandido em destaque, com toda a UI de sempre (case summary, safety check, evidence summary, disclaimer, botao Approve).
- "Earlier reports" abaixo lista o DRAFT de 09 Sept e o ARCHIVED de 30 Aug, colapsados, cada um com badge + queixa + data.
- Evidencia: screenshots/t-1-evidencia-timeline-multipla.png

### 8. Marcar como revisado num item antigo OK
Expandi o item DRAFT (09 Sept) na timeline - accordion abriu com sua propria ReportBody e botoes "Mark under review"/"Approve" independentes. Cliquei "Approve": o badge daquele item mudou de "Draft" para "Approved" instantaneamente (sem reload de pagina), o item mais recente (18 Sept, ja Approved) e o Archived (30 Aug) permaneceram inalterados.
- Evidencia: screenshots/t-1-evidencia-marcar-revisado-item-antigo.png
- Console do browser: 0 erros, 0 warnings durante todo o fluxo.

### 9. Paciente com um relatorio so OK
Paciente qa.evidence.onereport@example.test: aba Evidence mostra so o card expandido em destaque (Draft, 19 Sept), sem secao "Earlier reports", identico ao comportamento anterior a mudanca (sem regressao visual).
- Evidencia: screenshots/t-1-evidencia-um-relatorio-so.png
- Console: 0 erros, 0 warnings.

### 10. Paciente sem nenhum relatorio OK
Paciente qa.evidence.noreport@example.test: aba Evidence mostra "No evidence report yet." com botao "Generate report", sem erro, sem timeline quebrada, sem spinner infinito.
- Evidencia: screenshots/t-1-evidencia-estado-vazio.png
- Console: 0 erros, 0 warnings.

### 11. Regressao cross-tenant OK
Logout de qa.admina e login como qa.trainer@example.test (staff ADMIN da clinica B, "QA Studio PT"). Naveguei direto pela URL para a ficha do paciente qa.pacientea (clinica A): GET /admin/patients/<pacienteA> com sessao qa.trainer, clinica B.

A propria pagina da ficha ja bloqueia antes de chegar a aba Evidence: "Patient not found." / "Patient not found", com um botao "Back to Patients". Os 4 erros de console nessa navegacao sao os 404 esperados das chamadas GET /api/admin/patients/<id> e .../questions que alimentam a ficha - comportamento pre-existente do isolamento por tenant, nao especifico da rota de evidencia, e consistente com o 404 ja confirmado via curl no cenario 4c.
- Evidencia: screenshots/t-1-evidencia-cross-tenant-404.png

## Erros de console
Nenhum erro/warning de JavaScript nos fluxos normais (cenarios 6-10). No cenario 11 (cross-tenant), 4 erros de rede 404 sao esperados/corretos (bloqueio de acesso), nao indicam bug.

## Checagem de tipos
```
$ npx tsc --noEmit -p . | grep -v "^reconstruir/"
```
Erros remanescentes sao todos pre-existentes e fora do escopo desta tarefa (mobile/src/**, prisma/seed-marketplace.ts, scripts/migrate-to-multitenant.ts). Nenhum erro referencia evidence-report/route.ts ou evidence-report-tab.tsx (confirmado com grep -i "evidence-report" sobre a saida completa, zero linhas).

## Falhas e recomendacoes
Nenhuma falha na tarefa T-1. Todos os criterios de aceite do t-1-historico-relatorios-evidencia.md foram verificados com evidencia real:
- Multiplos relatorios: todos visiveis, ordenados do mais recente pro mais antigo - OK (cenario 1, 6).
- Um relatorio so: comportamento equivalente ao atual - OK (cenario 9).
- Sem relatorio: estado vazio claro, sem erro - OK (cenario 3, 10).
- Marcar como revisado funciona em qualquer item - OK (cenario 5, 8).
- Sem ?history=true: so o mais recente (compatibilidade) - OK (cenario 2).
- Isolamento cross-tenant - OK (cenario 4c, 11).
