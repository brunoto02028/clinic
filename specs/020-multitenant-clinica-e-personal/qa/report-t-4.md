# QA Report — T-4: Prontuário por ID

**Data:** 2026-09-10
**Executado por:** agente qa-tester. A sessão principal gravou o relatório porque a escrita do agente foi bloqueada.

**Resultado geral:** ✅ **aprovado** após três rodadas de correção e code review (histórico completo abaixo). O primeiro veredito foi reprovado (achado O1).

**Ambiente:** somente local, `next dev` em `http://localhost:4190` (`DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`). Nenhum acesso a prod, nenhuma edição de código.

**Como foi executado:**
- API por script Node, com login NextAuth (`/api/auth/csrf` → `/api/auth/callback/credentials`) e uma sessão por conta.
- O script usa o módulo `http`, porque o `fetch` do Node recusa a porta 4190.
- REG feito no Playwright.
- A rodada 1 foi descartada: estourou o limite do middleware, que é de 100 chamadas/min por IP em `/api/admin/patients/**`, com bloqueio de 5 min. A rodada 2 foi feita a 1 chamada/s, com fixtures recriados.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| N1 | qa.trainer (B) → os 50 handlers de `/api/admin/patients/{pacienteA}/**` + `GET/PATCH/DELETE /api/patients/{pacienteA}` | API | ✅ |
| N2 | qa.aluno (B) e qa.pacientea2 (A) → os 50 handlers | API | ✅ |
| N3 | Notas SOAP: trainer → 404; dono e fisioa → 200; PUT do fisioa gravado | API | ✅ |
| N4 | Triagem: trainer → 404 com `isLocked` inalterado; fisioa → 200 com `isLocked=true` | API | ✅ |
| N5 | Usuários: trainer → 404 com fisioA intacto; admina → 200 | API | ✅ |
| N6 | Dono do plano e do documento: 404 `Plan not found` / `Document not found`, registros intactos | API | ✅ |
| P1 | Positivos do fisioa (200); DELETE do pacienteA2 pelo admina (200, removido) | API | ✅ |
| P2 | Outro tenant × inexistente: status e corpo idênticos | API | ✅ |
| REG | qa.admina: `/admin/patients` e ficha do qa.pacientea | UI | ✅ |
| Sink | "Sent via Resend" no log da sessão | Log | ✅ (0) |
| O1 | *(prova extra)* escrita em registro de B por ID no corpo, via URL de um paciente de A | API | ❌ |

Rodada 2: 207 de 209 checagens bateram. As 2 divergências não vêm dos guards da T-4:
- chamada sem sessão recebe 307 do middleware (O2);
- `GET rehab-plan/[planId]` dá 500 por um bug antigo (F2).

## Detalhes

### N1 e N2 — os 50 handlers ✅
Foram 150 chamadas; todas voltaram exatamente com o corpo esperado:
- qa.trainer → **404 `{"error":"Patient not found"}`**;
- qa.aluno e qa.pacientea2 → **403 `{"error":"Forbidden"}`**.

Arquivos cobertos:
- `[id]`, `blood-pressure`, `invite`, `evidence-report`;
- `documents`, `documents/generate`;
- `atlas-treatment-plan`, `atlas-chat`;
- `protocol`, `protocol-revise`, `report`, `diagnosis`, `questions`;
- `rehab-plan`, `rehab-plan/pre-assess`, `rehab-plan/[planId]` (e `/chat`, `/send`);
- `messages`, `permissions`, `ai-import`, `packages`, `packages/checkout`.

Em `/api/patients/{pacienteA}`, o qa.trainer recebeu 404 em GET, PATCH e DELETE. O próprio qa.pacientea recebeu 200 no GET; pacientea2 e aluno receberam 404.

O banco do pacienteA foi fotografado antes e depois de todas essas chamadas e ficou idêntico. A foto inclui usuário, senha, token de cadastro, notas, documentos, mensagens, planos, diagnósticos, protocolos e triagem.

### N3 — Notas SOAP ✅
- **qa.trainer:** GET, PUT, PATCH, DELETE e PDF → 404 `{"error":"Clinical note not found"}`. A nota ficou intacta.
- **qa.pacientea (dono):** GET → 200.
- **qa.pacientea2:** GET → 404.
- **qa.fisioa:**
  - GET → 200;
  - PDF → 200 `text/html` (a rota gera HTML para impressão);
  - PUT `{"subjective":"QA T-4 edit by fisioA"}` → 200, gravado no banco com o `objective` preservado.

### N4 — Triagem ✅
- **qa.trainer:** `lock` e `approve-edit` → 404 `{"error":"Screening not found"}`, com `isLocked=false` e `editApprovedById=null` mantidos.
- **qa.aluno:** 401 (checagem de papel da própria rota).
- **qa.fisioa:** `lock` → 200 e `isLocked=true` no banco.

### N5 — Usuários ✅
- **qa.trainer:** GET, PUT (`{"isActive":false,"newPassword":"hacked-t4"}`) e DELETE em fisioA → 404 `{"error":"User not found"}`. O fisioA ficou intacto: ativo, THERAPIST, senha inalterada.
- **qa.admina:** GET fisioA → 200; GET trainerB → 404.

### N6 — Dono do plano e do documento ✅
O `POST /rehab-plan` chama IA paga. Por isso, o planB (do qa.aluno) e o docB foram inseridos via Prisma no banco local e removidos no fim.
- **qa.admina, pela URL do pacienteA, contra o planB:** PATCH, send DELETE, send POST e chat → 404 `{"error":"Plan not found"}`. O planB ficou intacto.
- **qa.admina, DELETE de documento:** `documentId=made-up-id` e `documentId={docB}` → 404 `{"error":"Document not found"}`. O docB ficou no banco.
- **qa.admina, `GET …/rehab-plan/{planB}`:** 500 — é o bug antigo F2.

### P1 — Positivos ✅
- **qa.fisioa:**
  - GET da ficha, documentos e mensagens → 200;
  - `DELETE /api/patients/{pacienteA2}` → 403 `Only admins can delete patients`.
- **qa.admina:**
  - `DELETE /api/patients/{fisioA}` (staff) → 404;
  - `DELETE /api/patients/{alunoB}` (outro tenant) → 404;
  - `DELETE /api/patients/{pacienteA2}` → 200 e removido. É o único DELETE positivo.

### P2 — Indistinguível ✅
Para o qa.trainer, registro do tenant A e ID inexistente devolvem status e corpo idênticos em:
- `admin/patients`;
- `soap-notes`;
- `admin/screening`;
- `admin/users`.

### REG — Telas ✅
- **`/admin/patients`:** mostra só pacientes do tenant A, e nenhum e-mail fora das fixtures (`screenshots/t-4-admina-lista-pacientes-tenant-a.png`).
- **Ficha do qa.pacientea:** as 10 abas renderizam sem erro (`screenshots/t-4-admina-ficha-pacientea.png`).
- **Aba Notas Clínicas:** só as notas do paciente (`screenshots/t-4-admina-ficha-notas-clinicas.png`).

### Sink ✅
**0** `Sent via Resend` na sessão. O `POST /invite` foi barrado pelo guard antes de enviar qualquer coisa.

### O1 — Escrita entre tenants por ID no corpo ❌
Setup local: uma nota SOAP e um documento do qa.aluno (tenant B), inseridos via Prisma e apagados no fim.

| Quem | Chamada | Status | Efeito no banco |
|---|---|---|---|
| qa.admina (A) | `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_soap_note","noteId":"{noteB}","subjective":"CROSS-TENANT-T4"}` | **200** | a nota de B foi alterada |
| qa.admina (A) | `PATCH /api/admin/patients/{pacienteA}/documents` `{"documentId":"{docB}","title":"CROSS-TENANT-T4"}` | **200** | o documento de B foi alterado |

## Erros de console
- `/admin/patients`: aviso de `key` faltando e `<a>` dentro de `<a>` em `components/patients/patients-list.tsx`. É preexistente e está na T-9.
- Ficha do paciente: nenhum erro.

## Falhas e recomendações
- **F1 (O1) — bloqueante.** O `staffPatientAccess` confere o paciente da URL, mas vários handlers alteram o registro cujo ID vem no corpo, sem checar o dono. Um staff de A escreve em B usando qualquer paciente próprio como ponte.
  - **Confirmado em runtime:** `edit_soap_note` e `documents` PATCH.
  - **Pela leitura do código:** as ações do PATCH de `[id]` (`edit_screening`, `delete_soap_note`, `edit_foot_scan`, `edit_body_assessment`, `edit_document`, `edit_diagnosis`, `edit_protocol`, `edit_protocol_item`), além de `evidence-report`, `diagnosis`, `protocol`, `protocol-revise`, `packages` e `packages/checkout`.
  - **Correção:** conferir que o registro pertence ao paciente da URL antes de cada update ou delete, no mesmo padrão já usado no DELETE de documentos e nas rotas `[planId]`.
- **F2 — anterior à T-4.** `GET /rehab-plan/[planId]` dá sempre 500: o `include: { createdBy: { select: { name: true } } }` pede um campo que não existe em `User`. Não vaza dado.
- **O2.** Sem sessão, `/api/admin/**` recebe 307 do middleware, não 401. A suíte da T-7 não deve esperar 401 aí.
- **O3.** Paciente recebe 401 em `admin/screening/[id]` e 403 em `admin/patients/**`. Nenhum dos dois revela se o registro existe.
- **O4 (ambiente).** O `fetch` do Node recusa a porta 4190. O middleware limita `/api/admin/patients/**` a 100 chamadas/min por IP. As duas coisas afetam a T-7.
- **Limpeza:** o RehabPlan da tentativa interrompida, o planB, o docB e os registros da O1 foram removidos. A saída final foi `leftover fixtures: 0`.

## Reteste da O1

**Data:** 2026-09-10
**Executado por:** agente qa-tester. Reteste focado na correção `recordOfPatient(model, id, patientId)` de `lib/staff-patient-access.ts`, inserida em 21 pontos.

**Resultado do reteste:** ❌ **reprovado**.
- Os 21 pontos corrigidos passaram: cada um devolveu 404 `{"error":"Not found"}` e o registro de B ficou idêntico.
- X2, P1, R1 e Sink também passaram, e a limpeza terminou sem sobras.
- **A O1 continua reproduzível** por um ramo que ficou fora da lista: o `newItem` do `protocol` PATCH (E1).
- Há também mass-assignment nas ações `edit_*`. Com ele, um staff de A move registros do próprio tenant para dentro de B (E2, E3).

**Ambiente:**
- Tudo local: o mesmo `next dev` em `http://localhost:4190` e o banco local.
- Script `t4-o1-retest.cjs`, no scratchpad da sessão:
  - usa o módulo `http`;
  - faz login NextAuth por conta;
  - faz 1 chamada a cada 1,1 s em `/api/admin/patients/**`.
- Nenhuma edição de código, nenhum acesso a prod. O `git status` de `app/` e `lib/` ficou igual ao do início.

**Inserido via Prisma no banco local (tudo removido no fim):**
- **Tenant B (qa.aluno):**
  - triagem `{screeningB}`;
  - nota SOAP `{noteB}`;
  - foot scan `{scanB}` (`FS-QA-O1-B`);
  - documento `{docB}`;
  - diagnóstico `{dxB}`;
  - protocolo `{protoB}`, ligado ao dxB, com o item `{itemB}`;
  - pacote `{pkgB}`;
  - evidence report `{repB}` (DRAFT).
  - A avaliação corporal usada foi a fixture `BA-QA-B1` (`{assessmentB1}`).
- **Tenant A (qa.pacientea):**
  - documento `{docA}`;
  - protocolo `{protoA}` com o item `{itemA}`.
  - Nota e triagem são as fixtures `{soapNoteA}` e `{screeningA}`.

### Resumo do reteste
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| X1 | qa.admina, pela URL do pacienteA, manda o id de um registro de B nos 21 pontos (e no chat do `protocol-revise`) | API | ✅ 22/22 → 404, registro de B idêntico |
| X2 | Injeção de operador: `"noteId": {"not": ""}` | API | ✅ 404, nada alterado |
| P1 | Positivos nos registros do próprio pacienteA | API | ✅ 5/5 → 200, gravado |
| R1 | Amostra da matriz anterior (trainer, aluno, fisioa) | API | ✅ 3/3 |
| Sink | `Sent via Resend` no log da sessão | Log | ✅ (0) |
| Limpeza | Inserts removidos, `tenant-cleanup` e consulta read-only | DB | ✅ `leftover fixtures: 0` e 0 linhas restantes |
| E1 | *(prova extra)* `protocol` PATCH com `newItem` e o `protocolId` de B | API | ❌ 200, item criado no protocolo de B |
| E2 | *(prova extra)* `edit_protocol_item` num item de A com `"protocolId": "{protoB}"` | API | ❌ 200, item de A movido para o protocolo de B |
| E3 | *(prova extra)* `edit_document` num doc de A com o `patientId` e o `clinicId` de B | API | ❌ 200, doc de A movido para o aluno/tenant B |
| E4 | *(prova extra)* `protocol-revise` com `apply` no protocolo de A e o item de B no lote | API | ✅ nada gravado. ⚠️ Responde 500 com o texto do Prisma |

### X1 — id de registro de B em cada ponto ✅
Quem chama: qa.admina (tenant A), pela URL `/api/admin/patients/{pacienteA}`. "Idêntico" quer dizer: o JSON da linha inteira de B, lido antes e depois de cada chamada, é igual, `updatedAt` incluído.

| # | Rota / ação | Corpo | Status e corpo | Banco |
|---|---|---|---|---|
| 1 | `PATCH /` `edit_screening` | `screeningId:{screeningB}, chiefComplaint` | 404 `{"error":"Not found"}` | screeningB idêntico |
| 2 | `PATCH /` `edit_soap_note` | `noteId:{noteB}, subjective` | 404 `{"error":"Not found"}` | noteB idêntica |
| 3 | `PATCH /` `delete_soap_note` | `noteId:{noteB}` | 404 `{"error":"Not found"}` | noteB existe, idêntica |
| 4 | `PATCH /` `edit_foot_scan` | `scanId:{scanB}, archType` | 404 `{"error":"Not found"}` | scanB idêntico |
| 5 | `PATCH /` `edit_body_assessment` | `assessmentId:{assessmentB1}, frontImageUrl` | 404 `{"error":"Not found"}` | BA-QA-B1 idêntica |
| 6 | `PATCH /` `edit_document` | `documentId:{docB}, title` | 404 `{"error":"Not found"}` | docB idêntico |
| 7 | `PATCH /` `edit_diagnosis` | `diagnosisId:{dxB}, therapistComments` | 404 `{"error":"Not found"}` | dxB idêntico |
| 8 | `PATCH /` `edit_protocol` | `protocolId:{protoB}, therapistComments` | 404 `{"error":"Not found"}` | protoB idêntico |
| 9 | `PATCH /` `edit_protocol_item` | `itemId:{itemB}, title` | 404 `{"error":"Not found"}` | itemB idêntico |
| 10 | `PATCH /diagnosis` | `diagnosisId:{dxB}, therapistComments` | 404 `{"error":"Not found"}` | dxB idêntico |
| 11 | `PATCH /documents` | `documentId:{docB}, title` | 404 `{"error":"Not found"}` | docB idêntico |
| 12 | `PATCH /evidence-report` | `reportId:{repB}, status:"ARCHIVED"` | 404 `{"error":"Report not found"}` (ver O6) | repB idêntico (segue DRAFT) |
| 13 | `POST /packages/checkout` | `packageId:{pkgB}` | 404 `{"error":"Not found"}`, antes do Stripe | pkgB idêntico |
| 14 | `POST /packages` | `protocolId:{protoB}, name` | 404 `{"error":"Not found"}` | protoB idêntico; pacotes do protoB: 1 (só o pkgB); pacotes do pacienteA: 0 |
| 15 | `PATCH /packages` | `packageId:{pkgB}, name` | 404 `{"error":"Not found"}` | pkgB idêntico |
| 16 | `DELETE /packages?packageId={pkgB}` | — | 404 `{"error":"Not found"}` | pkgB existe, idêntico |
| 17 | `POST /protocol` | `diagnosisId:{dxB}` | 404 `{"error":"Not found"}`, antes da IA | dxB idêntico; protocolos ligados ao dxB: 1 (só o protoB) |
| 18 | `PATCH /protocol` | `deleteItemId:{itemB}` | 404 `{"error":"Not found"}` | itemB existe, idêntico |
| 19 | `PATCH /protocol` | `itemId:{itemB}, itemUpdate:{title}` | 404 `{"error":"Not found"}` | itemB idêntico |
| 20 | `PATCH /protocol` | `protocolId:{protoB}, therapistComments` | 404 `{"error":"Not found"}` | protoB idêntico |
| 21 | `POST /protocol-revise` `apply` | `protocolId:{protoB}`, proposal que remove e edita itemB e troca o summary | 404 `{"error":"Not found"}` | protoB idêntico; itens do protoB: 1 |
| 21b | `POST /protocol-revise` (chat) | `protocolId:{protoB}, message:"qa"` | 404 `{"error":"Not found"}`, antes da IA | protoB idêntico |

**Contraprova (12b):** `reportId:"made-up-report-id"` recebeu o mesmo 404 `{"error":"Report not found"}` que o repB.

**Estado final:**
- Os 10 registros de B continuam no banco.
- Nenhuma tabela tem o marcador `CROSS-TENANT-O1` nos campos dos pontos 1–21.
- A checagem agregada do script deu ❌ por um único motivo: 1 `protocolItem` com o título `CROSS-TENANT-O1-NEWITEM`. Esse item foi criado pela prova **E1**, não por um ponto de X1.

### X2 — Injeção de operador ✅
| Chamada | Status |
|---|---|
| `PATCH /` `{"action":"edit_soap_note","noteId":{"not":""},"subjective":"INJECTION-O1"}` | 404 `{"error":"Not found"}` |
| `PATCH /` `{"action":"delete_soap_note","noteId":{"not":""}}` | 404 `{"error":"Not found"}` |
| `PATCH /documents` `{"documentId":{"not":""},"title":"INJECTION-O1"}` | 404 `{"error":"Not found"}` |
| `PATCH /` `edit_soap_note` com `noteId:"made-up-note-id"` (contraprova) | 404 `{"error":"Not found"}` |

**Banco:**
- as notas do pacienteA ficaram idênticas (1 nota) e a noteB também;
- 0 notas ou documentos com `INJECTION-O1`.

### P1 — Positivos em registros de A ✅
| Chamada (qa.admina) | Status | Banco |
|---|---|---|
| `PATCH /` `edit_soap_note` `{noteId:{soapNoteA}, subjective:"QA O1 P1 edit_soap_note"}` | 200 | `subjective` gravado |
| `PATCH /` `edit_screening` `{screeningId:{screeningA}, chiefComplaint:"QA O1 P1 edit_screening"}` | 200 | `chiefComplaint` gravado |
| `PATCH /` `edit_document` `{documentId:{docA}, title:"QA O1 P1 edit_document"}` | 200 | `title` gravado |
| `PATCH /documents` `{documentId:{docA}, description:"QA O1 P1 documents PATCH"}` | 200 | `description` gravado |
| `PATCH /protocol` `{protocolId:{protoA}, therapistComments:"QA O1 P1 protocol PATCH"}` | 200 | `therapistComments` gravado |

### R1 — Regressão (amostra) ✅
| Quem | `GET /api/admin/patients/{pacienteA}` |
|---|---|
| qa.trainer (B, ADMIN) | 404 `{"error":"Patient not found"}` |
| qa.aluno (B, PATIENT) | 403 `{"error":"Forbidden"}` |
| qa.fisioa (A, THERAPIST) | 200, `patient.id = {pacienteA}` |

### Provas extras (fora dos 21 pontos)

**E1 ❌ — `protocol` PATCH, ramo `newItem`**
- **Comando:** `PATCH /api/admin/patients/{pacienteA}/protocol` `{"protocolId":"{protoB}","newItem":{"title":"CROSS-TENANT-O1-NEWITEM","description":"x"}}`
- **Esperado:** 404 `{"error":"Not found"}` e nada criado.
- **Obtido:** 200.
  ```
  {"success":true,"item":{"id":"{itemE1}","protocolId":"{protoB}","phase":"SHORT_TERM","itemType":"HOME_EXERCISE","sortOrder":999,"title":"CROSS-TENANT-O1-NEWITEM","description":"x",...
  ```
- **Banco:** o protoB (do qa.aluno, tenant B) tinha 1 item e passou a ter 2.

**E2 ❌ — `edit_protocol_item` move um item de A para o protocolo de B**
- **Comando:** `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_protocol_item","itemId":"{itemA}","protocolId":"{protoB}"}`
- **Obtido:** 200.
  ```
  {"success":true,"item":{"id":"{itemA}","protocolId":"{protoB}",...,"title":"QA O1 item A",...
  ```
- **Banco:** `itemA.protocolId = {protoB}`. O protocolo de B ganhou um item escrito pelo tenant A.

**E3 ❌ — `edit_document` move um documento de A para o aluno de B**
- **Comando:** `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_document","documentId":"{docA}","patientId":"{alunoB}","clinicId":"{clinicB}"}`
- **Obtido:** 200.
  ```
  {"success":true,"document":{"id":"{docA}","clinicId":"{clinicB}","patientId":"{alunoB}","uploadedById":"{fisioA}",...
  ```
- **Banco:** `docA.patientId = {alunoB}` e `docA.clinicId = {clinicB}`. O prontuário do tenant B passou a mostrar um documento clínico do tenant A.

**E4 ✅ (⚠️) — lote do `protocol-revise` preso ao protocolo**
- **Comando:** `POST /protocol-revise` `{"action":"apply","protocolId":"{protoA}","proposal":{"removeItemIds":["{itemB}"],"updateItems":[{"itemId":"{itemB}","changes":{"title":"CROSS-TENANT-O1"}}]}}`
- **Obtido:** 500.
  ```
  {"error":"\nInvalid `prisma.protocolItem.update()` invocation:\n\n\nAn operation failed because it depends on one or more records that were required but not found. Record to update not found."}
  ```
- **Log:** `[protocol-revise] error: PrismaClientKnownRequestError ... code: 'P2025'`.
- **Banco:** itemB e protoA idênticos, porque a transação foi revertida. O filtro `{ id, protocolId }` funciona; só a resposta que é ruim (O5).

### Sink ✅
- Linhas novas no log da sessão: 87.
- `Sent via Resend`: **0**. `OUTBOUND-SINK`: 0. Linhas com "stripe": 0.
- O único erro de servidor na janela foi o P2025 provocado pela E4.

### Limpeza ✅
1. **Inserts removidos pelo script:** `{"packages":1,"items":3,"protocols":2,"diagnoses":1,"reports":1,"footScans":1,"documents":2,"noteB":1,"screeningB":1}`.
   - Os 3 itens: itemA (movido pela E2), itemB e o item da E1.
   - Os 2 documentos: docA (movido pela E3) e docB.
2. **`node scripts/qa/tenant-cleanup.cjs`:** `bodyAssessments: 3, soapNotes: 1, medicalScreenings: 1, appointments: 2, prescriptions: 1, exercises: 2, availability: 10, users: 8, clinics: 2`, com a saída final **`leftover fixtures: 0`**.
3. **Consulta read-only (`t4-o1-verify.cjs`):** buscou pelos ids dos usuários qa.*, pelos 2 tenants QA, pelos ids inseridos e pelos marcadores `CROSS-TENANT-O1`, `INJECTION-O1` e `QA O1`. Resultado: 0 linhas em `user`, `clinic`, `sOAPNote`, `medicalScreening`, `footScan`, `bodyAssessment`, `patientDocument`, `aIDiagnosis`, `treatmentProtocol`, `protocolItem`, `treatmentPackage` e `clinicalEvidenceReport` (**total 0**).

### Falhas e recomendações do reteste
- **F3 (E1) — bloqueante.** A O1 continua aberta em `app/api/admin/patients/[id]/protocol/route.ts`, no PATCH.
  - O ramo `if (newItem && protocolId)` (~l. 373) cria o `protocolItem` com o `protocolId` do corpo.
  - Ele roda **antes** do `recordOfPatient("treatmentProtocol", protocolId, params.id)` (l. 419).
  - **Correção:** exigir o `recordOfPatient` do `protocolId` dentro desse ramo, ou fazer o check sempre que vier `protocolId`, antes de qualquer ramo.
- **F4 (E2/E3) — bloqueante, mesma classe da O1.** Mass-assignment: estas ações repassam `...fields` direto ao `update`:
  - `edit_foot_scan`;
  - `edit_body_assessment`;
  - `edit_document`;
  - `edit_protocol_item`.
  - O `edit_screening` remove `id`, `userId` e `filledBy`, mas não `clinicId`.
  - **Efeito:** um staff de A regrava `patientId`, `clinicId` ou `protocolId` e move um registro próprio para dentro de B. O prontuário ou protocolo de B é alterado, e B passa a ver dado clínico de A.
  - **Confirmado em runtime:** `edit_protocol_item` (`protocolId`) e `edit_document` (`patientId` + `clinicId`).
  - **Pela leitura do código, não testado:** os demais casos, e o fato de o mesmo `data` aceitar chaves de relação do Prisma (`patient: { connect: … }`).
  - **Correção:** allowlist de campos por ação, como já fazem `edit_soap_note`, `edit_diagnosis` e `edit_protocol`. No mínimo, descartar `id`, `patientId`, `userId`, `clinicId`, `protocolId` e as chaves de relação.
- **O5 (E4) — não bloqueante.** Um item de outro protocolo no lote do `protocol-revise` gera 500 e devolve a mensagem crua do Prisma. Nada é gravado. Sugestão: responder 404 `{"error":"Not found"}` (validar os ids do lote antes da transação).
- **O6 — informativo.** No `evidence-report` PATCH, o `findFirst({ id: reportId, patientId })` que já existia barra o registro de B antes do novo check. A resposta é `{"error":"Report not found"}`, igual à de um id inexistente, então não revela nada. O `recordOfPatient` inserido ali nunca é alcançado num registro de outro paciente, e o corpo difere do `"Not found"` dos outros 20 pontos.

## Reteste 2 (newItem e mass-assignment)

**Data:** 2026-09-10
**Executado por:** agente qa-tester. Reteste focado na segunda rodada de correções:
- F3: o ramo `newItem && protocolId` do `protocol` PATCH agora chama `recordOfPatient("treatmentProtocol", …)` antes de criar o item;
- F4: `withoutOwnership(fields)` (`lib/staff-patient-access.ts`) descarta `id`, `patientId`, `userId`, `clinicId` e `protocolId` antes do Prisma. Vale para `edit_screening`, `edit_foot_scan`, `edit_body_assessment`, `edit_document`, `edit_protocol_item` e o `itemUpdate` do `protocol` PATCH.

**Resultado do reteste 2:** ❌ **reprovado**.
- Z1–Z4, Sink e limpeza passaram:
  - Z1: o `newItem` agora barra o protocolo de B;
  - Z2: as chaves de dono escalares são ignoradas nas 6 ações;
  - Z3: o caso positivo segue funcionando;
  - Z4: os 22 negativos da X1 continuam 404.
- **O mass-assignment continua aberto por outra porta** (E5–E10 e E12). O `withoutOwnership` remove só as FKs escalares. As chaves de relação do Prisma (`patient`, `clinic`, `user`, `protocol`, `uploadedBy`…) passam, e o Prisma as aceita como escrita aninhada:
  - `{"patient":{"connect":{"id":"{alunoB}"}},"clinic":{"connect":…}}` move o registro de A para o aluno/tenant B nas 6 ações (E5–E10);
  - `{"uploadedBy":{"update":{"role":"SUPERADMIN"}}}` num `edit_document` transformou o qa.fisioa em **SUPERADMIN** (E12). Ou seja, um ADMIN de tenant promove um usuário a admin da plataforma.

**Ambiente:**
- Tudo local: o banco local e o mesmo `next dev` em `http://localhost:4190`, sem reinício.
- A última recompilação por mudança de arquivo (`✓ Compiled in 2s`) é a linha 1700 do log, anterior à sessão. Durante os testes só houve compilações sob demanda, no primeiro acesso a cada rota. O código testado é, portanto, o mesmo do início ao fim.
- Scripts no scratchpad da sessão. Todos usam o módulo `http` e login NextAuth, com 1 chamada a cada 1,1 s em `/api/admin/patients/**`:
  - `t4-o1-retest.cjs`, **sem alterações** (Z4). Antes de rodar, as saídas da rodada anterior foram guardadas como `*.round1.*`;
  - `t4-r2.cjs` (Z1–Z3 e E5–E11), com login e setup copiados do anterior;
  - `t4-r2-nested.cjs` (E12);
  - `t4-r2-verify.cjs` e `t4-o1-verify.cjs` (read-only, depois da limpeza).
- Nenhuma edição de código, nenhum comando git de escrita, nenhum acesso a prod.
- O `git status` de `app/` e `lib/` ficou igual ao do início: 28 arquivos modificados e `lib/staff-patient-access.ts` não rastreado.
- Nenhum 429 na sessão.

**Inserido via Prisma no banco local (tudo removido no fim):**
- **Tenant B (qa.aluno):** só o protocolo `{protoB}` com o item `{itemB}`.
  - O aluno não recebeu triagem, documento nem foot scan. A única avaliação dele é a fixture `BA-QA-B1`.
  - Assim, qualquer movimentação de A para B aparece nas contagens do lado B. Isso também evita que o `userId @unique` da triagem barre um movimento por acaso.
- **Tenant A (qa.pacientea), para o Z2 e o Z3:**
  - protocolo `{protoA}` com os itens `{itemA}` (Z2.1) e `{itemA2}` (Z2.6);
  - documento `{docA}` (`QA R2 doc A`);
  - foot scan `{scanA}` (`FS-QA-R2-A`);
  - triagem e avaliação corporal são as fixtures `{screeningA}` e `BA-QA-A1` (`{assessmentA1}`).
- **Tenant A, só para as provas extras:**
  - itens `{itemR}` e `{itemR2}`, no protoA;
  - documento `{docR}`;
  - foot scan `{scanR}` (`FS-QA-R2-R`);
  - avaliação `{baR}` (`BA-QA-R2-A`);
  - no E12, documento `{docN}`.
- O Z4 insere e remove os próprios registros: os mesmos 12 do "Reteste da O1".

### Resumo do reteste 2
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| Z1 | `newItem` com o `protocolId` de B, pela URL do pacienteA | API | ✅ 404, itens do protoB 1 → 1 |
| Z2 | 6 edições em registros de A com `patientId`/`userId`/`clinicId`/`protocolId` de B no corpo | API | ✅ 6/6 → 200; campo comum gravado, dono inalterado |
| Z3 | `newItem` no protocolo do próprio pacienteA | API | ✅ 200, item criado no protoA (4 → 5) |
| Z4 | Os 22 negativos da X1, com o `t4-o1-retest.cjs` inalterado | API | ✅ 22/22 → 404, registros de B idênticos |
| Sink | `Sent via Resend` na sessão | Log | ✅ (0) |
| Limpeza | Inserts removidos, `tenant-cleanup` e consulta read-only | DB | ✅ `leftover fixtures: 0` e 0 linhas restantes |
| E5–E10 | *(prova extra)* as mesmas 6 edições, agora com chaves de **relação** (`patient`/`clinic`/`user`/`protocol` + `connect`) | API | ❌ 6/6 → 200, registro de A movido para B |
| E11 | *(prova extra)* `id` no corpo do `edit_protocol_item` | API | ✅ 200, id mantido |
| E12 | *(prova extra)* `edit_document` com `uploadedBy: { update: { role: "SUPERADMIN" } }` | API | ❌ 200, qa.fisioa virou SUPERADMIN |

### Z1 — `newItem` no protocolo de B ✅
- **Comando (qa.admina):** `PATCH /api/admin/patients/{pacienteA}/protocol` `{"protocolId":"{protoB}","newItem":{"title":"CROSS-T4-Z1"}}`
- **Obtido:** 404 `{"error":"Not found"}`.
- **Banco:**
  - itens do protoB: 1 antes, 1 depois;
  - 0 itens com o título `CROSS-T4-Z1`;
  - protoB idêntico (JSON da linha inteira, `updatedAt` incluído).
- **Na Z4:** o script antigo repetiu a prova E1 da rodada anterior (`newItem` `CROSS-TENANT-O1-NEWITEM`). Resultado: 404 `{"error":"Not found"}`, itens do protoB 1 → 1.

### Z2 — chaves de dono no corpo são ignoradas ✅
Quem chama: qa.admina, pela URL `/api/admin/patients/{pacienteA}`. As 6 respostas foram 200 `{"success":true,…}`.
- As colunas "Campo comum" e "Dono" comparam a linha do banco antes e depois.
- A coluna "Resposta" mostra os campos de dono do registro devolvido.

| # | Ação | Corpo (além do id do registro) | Campo comum (banco) | Dono (banco) | Resposta |
|---|---|---|---|---|---|
| 1 | `PATCH /` `edit_protocol_item` `{itemA}` | `protocolId:{protoB}, title:"Z2-item"` | `title="Z2-item"` | `protocolId` {protoA} → {protoA} | `protocolId={protoA}` |
| 2 | `PATCH /` `edit_document` `{docA}` | `patientId:{alunoB}, clinicId:{clinicB}, title:"Z2-doc"` | `title="Z2-doc"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} | `patientId={pacienteA}, clinicId={clinicA}` |
| 3 | `PATCH /` `edit_foot_scan` `{scanA}` | `patientId:{alunoB}, clinicId:{clinicB}, archType:"Z2-scan"` | `archType="Z2-scan"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} | `patientId={pacienteA}, clinicId={clinicA}` |
| 4 | `PATCH /` `edit_body_assessment` `{assessmentA1}` (BA-QA-A1) | `patientId:{alunoB}, clinicId:{clinicB}, therapistNotes:"Z2-ba"` | `therapistNotes="Z2-ba"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} | `patientId={pacienteA}, clinicId={clinicA}` |
| 5 | `PATCH /` `edit_screening` `{screeningA}` | `userId:{alunoB}, clinicId:{clinicB}, chiefComplaint:"Z2-screening"` | `chiefComplaint="Z2-screening"` | `userId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} | `userId={pacienteA}, clinicId={clinicA}` |
| 6 | `PATCH /protocol` `itemId:{itemA2}` | `itemUpdate:{protocolId:{protoB}, title:"Z2-itemUpdate"}` | `title="Z2-itemUpdate"` | `protocolId` {protoA} → {protoA} | `protocolId={protoA}` |

**Lado B, antes e depois do Z2 (idêntico):** `{"itemsProtoB":1,"docsAlunoB":0,"scansAlunoB":0,"basAlunoB":1,"screeningsAlunoB":0,"docsClinicB":0,"scansClinicB":0,"basClinicB":1,"screeningsClinicB":0}`.

**Na Z4:** as provas E2 e E3 da rodada anterior agora também dão 200 com o dono mantido:
- E2 (`edit_protocol_item` com `protocolId:{protoB}`): `itemA.protocolId={protoA}`;
- E3 (`edit_document` com `patientId`/`clinicId` de B): o docA segue em `{pacienteA}`/`{clinicA}`.

O script antigo marca essas duas chamadas como FAIL só porque esperava 404. As checagens de banco delas deram OK.

### Z3 — `newItem` no protocolo próprio ✅
- **Comando:** `PATCH /api/admin/patients/{pacienteA}/protocol` `{"protocolId":"{protoA}","newItem":{"title":"Z3-own"}}`
- **Obtido:** 200.
  ```
  {"success":true,"item":{"id":"{itemZ3}","protocolId":"{protoA}","phase":"SHORT_TERM","itemType":"HOME_EXERCISE","sortOrder":999,"title":"Z3-own",...
  ```
- **Banco:** o item existe com `protocolId={protoA}`; o protoA foi de 4 para 5 itens.

### Z4 — regressão dos 22 negativos da X1 ✅
O `t4-o1-retest.cjs` rodou **sem alterações**, com setup próprio, e gerou 75 linhas de resultado.
- **X1.1–X1.21 e X1.21b:** 22/22 → 404, com os mesmos corpos da rodada anterior:
  - `{"error":"Not found"}` em 21;
  - `{"error":"Report not found"}` no `evidence-report` (X1.12, ver O6). A contraprova X1.12b, com id inexistente, deu o mesmo 404.
- **Banco:**
  - as 22 checagens "registro idêntico (inclui updatedAt)" deram OK;
  - os 10 registros de B existem no fim;
  - 0 marcadores `CROSS-TENANT-O1` em todas as tabelas;
  - pacotes do protoB: 1; protocolos ligados ao dxB: 1; itens do protoB: 1.
- **Resto do script:** X2 (4 × 404, nada alterado), P1 (5 × 200, gravado) e R1 (trainer 404, aluno 403, fisioa 200) passaram como antes.
- **Resultado agregado:** 75 linhas, 2 marcadas FAIL. As duas são a E2 e a E3, cuja mudança é esperada (ver Z2). A E4 continua em 500 (O5, abaixo).

### Provas extras (fora dos cenários pedidos)

**E5–E10 ❌ — chaves de relação atravessam o `withoutOwnership`**
O `withoutOwnership` apaga só as FKs escalares. As rotas repassam o resto do corpo ao `update`, e o Prisma aceita a relação como escrita aninhada (`connect`).

Mesmo cenário do Z2: registros de A, URL do pacienteA, qa.admina.

| # | Ação | Corpo (além do id do registro) | Status | Banco |
|---|---|---|---|---|
| E5 | `edit_document` `{docR}` | `patient:{connect:{id:{alunoB}}}, clinic:{connect:{id:{clinicB}}}, title:"E-rel-doc"` | 200 | `patientId` {pacienteA} → **{alunoB}**; `clinicId` {clinicA} → **{clinicB}** |
| E6 | `edit_protocol_item` `{itemR}` | `protocol:{connect:{id:{protoB}}}, title:"E-rel-item"` | 200 | `protocolId` {protoA} → **{protoB}** |
| E7 | `protocol` PATCH `itemId:{itemR2}` | `itemUpdate:{protocol:{connect:{id:{protoB}}}, title:"E-rel-itemUpdate"}` | 200 | `protocolId` {protoA} → **{protoB}** |
| E8 | `edit_foot_scan` `{scanR}` | `patient:{connect:{id:{alunoB}}}, clinic:{connect:{id:{clinicB}}}, archType:"E-rel-scan"` | 200 | `patientId` {pacienteA} → **{alunoB}**; `clinicId` {clinicA} → **{clinicB}** |
| E9 | `edit_body_assessment` `{baR}` | `patient:{connect:{id:{alunoB}}}, clinic:{connect:{id:{clinicB}}}, therapistNotes:"E-rel-ba"` | 200 | `patientId` {pacienteA} → **{alunoB}**; `clinicId` {clinicA} → **{clinicB}** |
| E10 | `edit_screening` `{screeningA}` | `user:{connect:{id:{alunoB}}}, clinic:{connect:{id:{clinicB}}}, chiefComplaint:"E-rel-screening"` | 200 | `userId` {pacienteA} → **{alunoB}**; `clinicId` {clinicA} → **{clinicB}** |

Exemplo de resposta (E5):
```
{"success":true,"document":{"id":"{docR}","clinicId":"{clinicB}","patientId":"{alunoB}","uploadedById":"{fisioA}",...
```

**Lado B depois das provas E:**
- antes: `{"itemsProtoB":1,"docsAlunoB":0,"scansAlunoB":0,"basAlunoB":1,"screeningsAlunoB":0,"docsClinicB":0,"scansClinicB":0,"basClinicB":1,"screeningsClinicB":0}`;
- depois: `{"itemsProtoB":3,"docsAlunoB":1,"scansAlunoB":1,"basAlunoB":2,"screeningsAlunoB":1,"docsClinicB":1,"scansClinicB":1,"basClinicB":2,"screeningsClinicB":1}`.

É o mesmo efeito da E2/E3 da rodada anterior, por outra chave:
- o protocolo de B ganhou 2 itens do tenant A;
- o prontuário do aluno B passou a ter documento, foot scan, avaliação corporal e triagem do paciente A.

**E11 ✅ — `id` no corpo**
- **Comando:** `PATCH /` `{"action":"edit_protocol_item","itemId":"{itemA}","id":"qa-r2-hijack-id","title":"E-id"}`
- **Obtido:** 200.
- **Banco:** o itemA mantém o id e ficou com `title="E-id"`; não existe item com id `qa-r2-hijack-id`.

**E12 ❌ — escrita aninhada chega à conta do usuário (escalada de privilégio)**
- **Comando (qa.admina, ADMIN do tenant A):** `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_document","documentId":"{docN}","uploadedBy":{"update":{"role":"SUPERADMIN"}},"title":"E12-nested"}`
- **Obtido:** 200.
  ```
  {"success":true,"document":{"id":"{docN}","clinicId":"{clinicA}","patientId":"{pacienteA}","uploadedById":"{fisioA}",...
  ```
- **Banco:** `fisioA.role` THERAPIST → **SUPERADMIN**. O script restaurou `THERAPIST` logo em seguida, e o `tenant-cleanup` apagou a conta no fim.
- **Por que é grave:** qualquer relação com `User` aceita `update` aninhado (`uploadedBy`, `patient`, `therapist`, `user`). Um staff de tenant regrava papel, `clinicId`, e-mail ou senha de uma conta ligada a um registro que ele edita. Isso inclui a própria conta, se ele for o autor de algum documento.
- **Não testado:**
  - se a sessão já aberta passa a valer como SUPERADMIN;
  - o encadeamento com a E5–E10: primeiro `uploadedBy: { connect: { id: <staff de B> } }` num registro próprio, depois `uploadedBy: { update: … }`. Isso alcançaria a conta de um staff de outro tenant.

### Sink ✅
- **Janela da sessão:** 108 linhas novas no log do `next dev` (linhas 1701–1808).
- `Sent via Resend`: **0**. `OUTBOUND-SINK`: 0.
- **Respostas 500:** 1, no `POST …/protocol-revise` (prova E4 do script antigo, erro Prisma `P2025`).
  - É a O5 já reportada: nada é gravado, mas a mensagem crua do Prisma volta ao cliente.
  - Nenhum 500 nos cenários Z nem nas provas E5–E12.

### Limpeza ✅
1. **Inserts removidos pelos scripts:**
   - `t4-r2.cjs`: `{"items":6,"protocols":2,"documents":2,"footScans":2,"bodyAssessments":1}`. A remoção foi por id.
     - Os 6 itens: itemA, itemA2, itemB, itemR, itemR2 e o item da Z3. O itemR e o itemR2 estavam no protoB (E6/E7).
     - O docR, o scanR e o baR estavam no aluno B (E5/E8/E9).
   - `t4-o1-retest.cjs` (Z4): `{"packages":1,"items":2,"protocols":2,"diagnoses":1,"reports":1,"footScans":1,"documents":2,"noteB":1,"screeningB":1}`.
   - `t4-r2-nested.cjs`: docN removido e `fisioA.role` restaurado para THERAPIST.
   - A triagem `{screeningA}` terminou no aluno B (E10) e a BA-QA-A1 ficou com `therapistNotes` alterado. As duas são fixtures e saíram no passo 2.
2. **`node scripts/qa/tenant-cleanup.cjs`:** `bodyAssessments: 3, soapNotes: 2, medicalScreenings: 2, appointments: 2, prescriptions: 1, exercises: 2, availability: 10, refreshTokens: 0, emailMessages: 0, passwordResetTokens: 0, verificationCodes: 0, users: 8, clinics: 2`, com a saída final **`leftover fixtures: 0`**.
3. **Consultas read-only:**
   - `t4-r2-verify.cjs` buscou pelos ids dos usuários qa.*, pelos 2 tenants QA, pelos ids inseridos e pelos marcadores `CROSS-T4-Z1`, `Z2-*`, `Z3-own`, `E-rel-*`, `E-id`, `QA R2*`, `FS-QA-*` e `BA-QA-*`. Resultado: `{"user":0,"clinic":0,"treatmentProtocol":0,"protocolItem":0,"patientDocument":0,"footScan":0,"bodyAssessment":0,"medicalScreening":0}` (**total 0**).
   - `t4-o1-verify.cjs` (inserts do Z4): 0 nas 12 tabelas (**total 0**).

### Falhas e recomendações do reteste 2
- **F3 — resolvida.** O `newItem` agora passa pelo `recordOfPatient`: Z1 e a E1 da Z4 deram 404, sem nada criado.
- **F4 — resolvida em parte; o que resta é bloqueante (F5).** As FKs escalares são descartadas (Z2, 6/6). Mas o `...fields` / `itemUpdate` ainda vai inteiro para o `update`, e o Prisma aceita nele:
  - **chaves de relação com `connect`:** movem o registro para outro paciente, protocolo ou tenant. Confirmado nas 6 ações (E5–E10);
  - **escrita aninhada em relações** (`update`, `create`, `upsert`, `delete`…): alcança outras tabelas, inclusive `User`. Na E12, um ADMIN de tenant promoveu uma conta a SUPERADMIN.
  - **Onde:**
    - `app/api/admin/patients/[id]/route.ts`: `edit_screening` (~l. 172–190), `edit_foot_scan` (~222–233), `edit_body_assessment` (~236–248), `edit_document` (~251–263) e `edit_protocol_item` (~319–330);
    - `app/api/admin/patients/[id]/protocol/route.ts`: o ramo `itemUpdate` (~406–415).
  - **Correção:** trocar a denylist por uma **allowlist de campos escalares por ação**, como já fazem `edit_soap_note`, `edit_diagnosis` e `edit_protocol`.
    - Alternativa genérica: aceitar só chaves que sejam campos escalares do modelo (ex.: `Prisma.<Model>ScalarFieldEnum`), menos os de dono e o `id`.
    - Uma denylist com os nomes das relações é frágil: cada modelo tem as suas (`uploadedBy`, `therapist`, `exercise`, `protocol`, `patient`, `clinic`, `user`…).
  - **Para a T-7:** incluir a E5–E10 e a E12 como casos da suíte de isolamento.
- **O5 — continua, não bloqueante.** `protocol-revise` `apply` com item de outro protocolo no lote → 500 com a mensagem crua do Prisma. Nada é gravado.
- **O6 — informativo, sem mudança.** O `evidence-report` responde `{"error":"Report not found"}`, não `"Not found"`.

## Reteste 3 (allowlist pickEditable)

**Data:** 2026-09-10
**Executado por:** agente qa-tester. Reteste focado na terceira rodada de correção, que troca a denylist pela allowlist:
- a função `withoutOwnership` (denylist) foi removida;
- as ações de edição livre agora usam `pickEditable(model, body)` de `lib/tenant-field-guard.ts` — uma **allowlist** derivada do DMMF do Prisma, que mantém só as colunas escalares/enum próprias do modelo. Campos de relação (`patient`, `clinic`, `uploadedBy`, `protocol`), FKs (`patientId`, `clinicId`, `protocolId`, `exerciseId`, `uploadedById`, …), o `id` e os timestamps caem pelo nome;
- aplicada em `edit_screening`, `edit_foot_scan`, `edit_body_assessment`, `edit_document`, `edit_protocol_item` (em `app/api/admin/patients/[id]/route.ts`) e no `itemUpdate` do `protocol` PATCH (em `.../protocol/route.ts`).

**Resultado do reteste 3:** ✅ **aprovado**.
- W1: as 6 escritas de relação (`connect`) são aceitas com **200**, o campo escalar comum muda e o dono (`patientId`/`clinicId`/`protocolId`/`userId`) fica inalterado no banco. Nenhum registro de A migra para B.
- W2: a escrita aninhada de escalada de privilégio (`uploadedBy: { update: { role: "SUPERADMIN" } }`) é aceita com **200**, o `title` muda, e **nenhum papel de usuário mudou** — qa.fisioa segue THERAPIST (o vetor E12 do reteste 2 está morto).
- W3: a forma escalar da FK (`patientId` no corpo) continua descartada (200, dono inalterado).
- W4: os positivos seguem funcionando (200, campos escalares gravados).
- W5: os 22 negativos cross-tenant continuam 404 com B intacto, e o `newItem` no protocolo de B (Z1/E1) dá 404 sem criar item.
- Sink 0 e limpeza sem sobras.

**Confirmei em runtime que a correção fechou os dois vetores que passavam no reteste 2:** a chave de relação com `connect` (E5–E10) e a escrita aninhada que chegava ao `User` (E12). O `pickEditable`, por ser allowlist, descarta qualquer chave que não seja coluna escalar própria do modelo — tanto FKs escalares quanto relações — então não depende de manter uma lista de nomes de relação por modelo.

**Ambiente:**
- Tudo local: o mesmo `next dev` em `http://localhost:4190` e o banco local. Nenhum reinício de servidor, nenhum acesso a prod.
- Nenhuma edição de código, nenhum comando git de escrita. `lib/tenant-field-guard.ts` é o novo arquivo da correção; `withoutOwnership`/`lib/staff-patient-access.ts` seguem no repo mas o `pickEditable` é quem guarda os campos.
- Scripts no scratchpad da sessão, todos usando o módulo `http` e login NextAuth, com 1 chamada a cada 1,1 s em `/api/admin/patients/**`:
  - `t4-r3.cjs` (W1–W4 + Sink + limpeza dos próprios inserts), com login/setup copiados do `t4-r2.cjs`;
  - `t4-o1-retest.cjs`, **sem alterações** (W5).
- Nenhum 429 na sessão.

**Inserido via Prisma no banco local (tudo removido no fim):**
- **Tenant B (qa.aluno):** só o protocolo `{protoB}` com o item `{itemB}`. O aluno não recebeu triagem, documento nem foot scan (a única avaliação dele é a fixture `BA-QA-B1`), então qualquer movimentação de A para B apareceria nas contagens do lado B.
- **Tenant A (qa.pacientea):** protocolo `{protoA}` com os itens `{itemW1}` (W1.5) e `{itemW1u}` (W1.6); documentos `{docW1}` (W1.1), `{docW2}` (W2, `uploadedById` = qa.fisioa), `{docW3}` (W3) e `{docW4}` (W4); foot scan `{scanW1}` (`FS-QA-R3-W1`, W1.2). A triagem e a avaliação corporal usadas são as fixtures `{screeningA}` e `BA-QA-A1` (`{assessmentA1}`).
- O W5 (`t4-o1-retest.cjs`) insere e remove seus próprios 12 registros, como no "Reteste da O1".

### Resumo do reteste 3
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| W1 | 6 edições em registros de A com chave de **relação** (`patient`/`clinic`/`user`/`protocol` + `connect`) pela URL do pacienteA | API | ✅ 6/6 → 200, campo comum gravado, dono inalterado, lado B idêntico |
| W2 | `edit_document` com `uploadedBy: { update: { role: "SUPERADMIN" } }` | API | ✅ 200, `title` gravado, qa.fisioa segue THERAPIST, nenhum papel mudou |
| W3 | `edit_document` com `patientId` escalar de B no corpo | API | ✅ 200, `title` gravado, `patientId` inalterado |
| W4 | Positivos: `edit_document` (`title`+`description`) e `edit_screening` (`chiefComplaint`+`nightPain`) | API | ✅ 2/2 → 200, escalares gravados |
| W5 | Os 22 negativos cross-tenant + Z1 (`newItem` em B), com o `t4-o1-retest.cjs` inalterado | API | ✅ 22/22 → 404 e Z1 → 404, registros de B idênticos |
| Sink | `Sent via Resend` na sessão | Log | ✅ (0) |
| Limpeza | Inserts removidos, `tenant-cleanup` e consulta read-only | DB | ✅ `leftover fixtures: 0` e 0 linhas restantes |

### W1 — chave de relação com `connect` não move o registro ✅
Quem chama: qa.admina (tenant A), pela URL `/api/admin/patients/{pacienteA}`, sempre contra registros do próprio tenant A. As 6 respostas foram **200** `{"success":true,…}`. As colunas de dono foram lidas no banco antes e depois.

| # | Ação | Corpo (além do id do registro) | Campo comum (banco) | Dono (banco) |
|---|---|---|---|---|
| 1 | `edit_document` `{docW1}` | `patient:{connect:{id:{alunoB}}}, clinic:{connect:{id:{clinicB}}}, title:"W1-doc"` | `title="W1-doc"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} |
| 2 | `edit_foot_scan` `{scanW1}` | `patient:{connect:{id:{alunoB}}}, clinicianNotes:"W1-scan"` | `clinicianNotes="W1-scan"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} |
| 3 | `edit_body_assessment` `{assessmentA1}` (BA-QA-A1) | `patient:{connect:{id:{alunoB}}}, therapistNotes:"W1-ba"` | `therapistNotes="W1-ba"` | `patientId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} |
| 4 | `edit_screening` `{screeningA}` | `user:{connect:{id:{alunoB}}}, chiefComplaint:"W1-scr"` | `chiefComplaint="W1-scr"` | `userId` {pacienteA} → {pacienteA}; `clinicId` {clinicA} → {clinicA} |
| 5 | `edit_protocol_item` `{itemW1}` | `protocol:{connect:{id:{protoB}}}, title:"W1-item"` | `title="W1-item"` | `protocolId` {protoA} → {protoA} |
| 6 | `protocol` PATCH `itemId:{itemW1u}` | `itemUpdate:{protocol:{connect:{id:{protoB}}}, title:"W1-itemUpdate"}` | `title="W1-itemUpdate"` | `protocolId` {protoA} → {protoA} |

**Lado B, antes e depois do W1 (idêntico):** `{"itemsProtoB":1,"docsAlunoB":0,"scansAlunoB":0,"basAlunoB":1,"screeningsAlunoB":0,"docsClinicB":0,"scansClinicB":0,"basClinicB":1,"screeningsClinicB":0}`. Nenhum item entrou no protoB e nenhum documento/scan/triagem apareceu no aluno B ou na clínica B. É o vetor E5–E10 do reteste 2, agora fechado.

### W2 — escalada de privilégio morta ✅
- **Comando (qa.admina, ADMIN do tenant A):** `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_document","documentId":"{docW2}","uploadedBy":{"update":{"role":"SUPERADMIN"}},"title":"W2"}`
- **Obtido:** 200. `title` "QA R3 doc W2" → "W2". A resposta traz `uploadedById={fisioA}` inalterado.
- **Banco:** os papéis de todos os usuários qa.* foram fotografados antes e depois e ficaram idênticos:
  ```
  {"qa.superadmin":"SUPERADMIN","qa.admina":"ADMIN","qa.fisioa":"THERAPIST","qa.pacientea":"PATIENT","qa.pacientea2":"PATIENT","qa.trainer":"ADMIN","qa.aluno":"PATIENT","qa.pendente":"PATIENT"}
  ```
  Confirmação direta pós-teste: `qa.fisioa@example.test` segue **THERAPIST**. A escrita aninhada `uploadedBy.update.role` foi descartada pelo `pickEditable` (a chave `uploadedBy` não é coluna escalar de `PatientDocument`). O E12 do reteste 2 está resolvido.

### W3 — FK escalar continua descartada ✅
- **Comando:** `PATCH /api/admin/patients/{pacienteA}` `{"action":"edit_document","documentId":"{docW3}","patientId":"{alunoB}","title":"W3"}`
- **Obtido:** 200. `title` gravado; `patientId` {pacienteA} → {pacienteA}. Sem regressão do comportamento do reteste 2.

### W4 — positivos seguem funcionando ✅
| Ação (qa.admina) | Status | Banco |
|---|---|---|
| `edit_document` `{docW4}` `{title:"W4", description:"d"}` | 200 | `title="W4"`, `description="d"` gravados |
| `edit_screening` `{screeningA}` `{chiefComplaint:"W4", nightPain:true}` | 200 | `chiefComplaint="W4"`, `nightPain=true` gravados |

### W5 — regressão dos 22 negativos + Z1 ✅
O `t4-o1-retest.cjs` rodou **sem alterações**.
- **X1.1–X1.21 e X1.21b:** 22/22 → 404 (`{"error":"Not found"}`, ou `{"error":"Report not found"}` no `evidence-report`, ver O6). As 22 checagens "registro idêntico (inclui `updatedAt`)" deram OK; os 10 registros de B existem no fim; 0 marcadores `CROSS-TENANT-O1` em todas as tabelas.
- **Z1 (E1 do script) — `newItem` no protocolo de B:** 404 `{"error":"Not found"}`, itens do protoB 1 → 1, nada criado.
- **X2** (4 × 404, nada alterado), **P1** (5 × 200, gravado) e **R1** (trainer 404, aluno 403, fisioa 200) passaram.
- **Resultado agregado:** 75 linhas, 2 marcadas FAIL. As duas são E2 e E3, que agora respondem **200** (o script antigo esperava 404): as chaves de dono escalares (`protocolId`/`patientId`/`clinicId`) são descartadas pelo `pickEditable`, então o `itemA` segue no protoA e o `docA` segue em pacienteA/clinicA. As checagens de banco de E2/E3 deram OK. É o mesmo comportamento esperado já visto na Z4 do reteste 2. **E4** continua em 500 (O5, nada gravado).

### Sink ✅
- `t4-r3.cjs`: 17 linhas novas no log, `Sent via Resend`=0, `OUTBOUND-SINK`=0, respostas 500=0.
- `t4-o1-retest.cjs`: 83 linhas novas, `Sent via Resend`=0, `OUTBOUND-SINK`=0. O único 500 foi o P2025 da prova E4 (O5), nada gravado.

### Limpeza ✅
1. **`t4-r3.cjs`:** removeu seus inserts por id — `{"items":3,"protocols":2,"documents":4,"footScans":1}`. Nenhum papel precisou ser restaurado (a rotina defensiva não encontrou desvio). As fixtures alteradas (`screeningA`, `BA-QA-A1`) saíram no `tenant-cleanup`.
2. **`t4-o1-retest.cjs` (W5):** `{"packages":1,"items":2,"protocols":2,"diagnoses":1,"reports":1,"footScans":1,"documents":2,"noteB":1,"screeningB":1}`.
3. **`node scripts/qa/tenant-cleanup.cjs`:** `bodyAssessments: 3, soapNotes: 1, medicalScreenings: 1, appointments: 2, prescriptions: 1, exercises: 2, availability: 10, users: 8, clinics: 2`, com a saída final **`leftover fixtures: 0`**.
4. **Consulta read-only:** buscou pelos usuários qa.* (`@example.test`), pelos 2 tenants QA e pelos marcadores/inserts do reteste 3 (`QA R3*`, `FS-QA-R3*`, `W1-*`, `W2`/`W3`/`W4`). Resultado: `{"users":0,"clinics":0,"protocols":0,"items":0,"docs":0,"scans":0,"screenChief":0}` (**total 0**).

### Falhas e recomendações do reteste 3
- **F5 (E5–E10 e E12) — resolvida.** O `pickEditable` (allowlist derivada do DMMF) fecha tanto a chave de relação com `connect` (W1) quanto a escrita aninhada que chegava ao `User` (W2). As FKs escalares seguem descartadas (W3) e os positivos continuam (W4). Nenhum registro de A migra para B e nenhum papel de usuário é alterado.
- **O5 — continua, não bloqueante.** `protocol-revise` `apply` com item de outro protocolo no lote → 500 com a mensagem crua do Prisma. Nada é gravado. Fora do escopo desta correção.
- **O6 — informativo, sem mudança.** O `evidence-report` responde `{"error":"Report not found"}`, não `"Not found"`.
- **Para a T-7:** manter W1 (relação `connect` nas 6 ações) e W2 (`uploadedBy.update.role`) como casos da suíte de isolamento.

## Code review (rodada final)
6 achados. Corrigidos:
- **#2 (oráculo de enumeração):** `assertPatientAccess` devolvia 409 com mensagem distinta para qualquer paciente sem clínica, deixando um staff distinguir "conta sem clínica" de "id inexistente". Agora responde 404 como qualquer id inacessível; a mensagem 409 útil fica no nível da rota, para o próprio paciente sem clínica.
- **#6 (hierarquia de papel):** `staffUserAccess` conferia só o tenant, então um ADMIN podia editar/apagar um SUPERADMIN da mesma clínica. Agora quem não é SUPERADMIN recebe 404 ao agir sobre um SUPERADMIN.
- **#4 (código morto):** removida a checagem de PATIENT no PDF da nota, já coberta pelo `soapNoteAccess`, e os dois locais sem uso.

Não corrigidos (intencional/follow-up):
- **#1 e #5:** SUPERADMIN sem clínica selecionada e paciente sem clínica recebem, de propósito, o comportamento fechado (D4; item 3 da T-14). Em prod hoje, com uma clínica, o SUPERADMIN cai nela e nada muda.
- **#3 (performance):** as rotas resolvem identidade 2-3 vezes por request (guard + checagem própria de papel). Refatorar os 23 handlers agora traria risco de regressão sem ganho de correção. Fica como follow-up de otimização.
- **O5:** `protocol-revise` devolve mensagem crua do Prisma num 500 quando o item é de outro protocolo; nada é gravado. Vira caso da T-7.

Verificação final: 153/153 testes; `tsc` sem erro nos arquivos tocados.

**Veredito: APROVADO** (após três rodadas de correção + review).
