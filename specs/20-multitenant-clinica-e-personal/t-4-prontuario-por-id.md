# T-4: Prontuário por ID

**Status:** concluído
**Trilha:** PLATAFORMA
**Depende de:** T-2 (usa o mesmo desenho da T-3)

## Objetivo
Fechar C2, C3 e C5: staff de um tenant lê, edita e apaga prontuário, notas SOAP e usuários de outro tenant. Confirmado nos ISO-1, ISO-8b e ISO-9 da atividade 19.

## Escopo real (mapeado em 2026-09-10)
São **28 arquivos e ~70 handlers**, bem acima do previsto.

| Grupo | Arquivos | Chave | Correção |
|---|---|---|---|
| `admin/patients/[id]` e as **22 sub-rotas** (ai-import, atlas-chat, atlas-treatment-plan, blood-pressure, diagnosis, documents, documents/generate, evidence-report, invite, messages, packages, packages/checkout, permissions, protocol, protocol-revise, questions, rehab-plan, rehab-plan/pre-assess, rehab-plan/[planId], [planId]/chat, [planId]/send, report) | 23 | ID do paciente | guard único `staffPatientAccess(request, params.id)` no início de cada handler |
| `rehab-plan/[planId]/*` | 3 | paciente + plano | além do guard do paciente, o plano precisa pertencer a esse paciente |
| `patients/[id]` | 1 (GET, PATCH, DELETE) | ID do paciente | mesmo guard; o DELETE apaga só `role = PATIENT` |
| `soap-notes/[id]` e `soap-notes/[id]/pdf` | 2 | ID da nota | paciente só a própria; staff só do mesmo tenant |
| `admin/screening/[id]` | 1 | ID da triagem | staff do tenant do paciente da triagem |
| `admin/users/[id]` | 1 | ID do usuário | `assertClinicAccess` sobre o tenant do usuário |

Casos especiais confirmados na leitura do código:
- `admin/patients/[id]/documents` **DELETE** não recebe `params`: apaga **qualquer** `PatientDocument` pelo `documentId` da query, checando só o papel. Correção: guard do paciente da URL **e** documento pertencente a esse paciente.
- `admin/screening/[id]` **PATCH** (usa `params` assíncrono) destrava/trava **qualquer** triagem pelo ID, checando só o papel. Correção: carregar a triagem e aplicar o guard ao paciente dela (`userId`).
- `rehab-plan/[planId]` PATCH e `[planId]/send` (POST/DELETE) buscam e alteram o plano **só pelo `planId`**. Correção: o plano precisa pertencer ao paciente do guard.
- Os handlers usam nomes de parâmetro diferentes (`req`, `_req`, `request`). O patch insere o guard com o nome de cada handler, antes da linha `getServerSession`, respeitando a indentação.

## Passos
1. `lib/patient-access.ts` já existe (regras de módulo do paciente). O guard entra num helper novo, no mesmo formato do `staffAssessmentAccess` da T-3: responde 401, 403 ou 404 com o **mesmo corpo de "não encontrado"** das rotas.
2. Aplicar o guard por script de patch com âncoras exatas e contagem esperada por arquivo, como na T-3.
3. Nas rotas `[planId]`, verificar que o plano pertence ao paciente do guard.
4. Rotas por ID de registro (notas SOAP, triagem, usuários): carregar o registro e usar `canAccessRecord`/`assertClinicAccess`.

## Critérios de aceite
- [ ] Cenários da T-4 passando, estendidos às 22 sub-rotas (staff de outro tenant recebe 404 em todas).
- [ ] O DELETE de `patients/[id]` não apaga staff nem paciente de outro tenant.
- [ ] Regressão: a ficha completa de paciente da BPR fica igual para o SUPERADMIN.

## Registro
- **QA (1ª rodada):** `qa/report-t-4.md` — os 10 cenários pedidos passaram, com 207/209 checagens. O agente reprovou a tarefa por uma prova extra, a **O1**: o guard confere o paciente da URL, mas vários handlers alteravam o registro cujo ID vinha no corpo, sem checar o dono. Um staff do tenant A editou a nota e o documento de um aluno do tenant B usando a URL de um paciente próprio.
- **Correção da O1:** `recordOfPatient(modelo, id, pacienteDaURL)` em `lib/staff-patient-access.ts`. O registro precisa pertencer ao paciente da URL, e um ID que não seja texto — por exemplo, um objeto-operador do Prisma — nunca casa. Foram 21 checagens:
  - nas ações do PATCH da ficha;
  - em `diagnosis`, `documents`, `evidence-report`, `packages`, `packages/checkout`, `protocol` e `protocol-revise`.

  No `protocol-revise`, o lote de itens fica restrito ao protocolo validado. Foram acrescentados testes do helper: 144/144.
- **Fim de linha:** a inserção de import do patch da T-4 deixava um `\r` a mais por linha, o que fazia o git mostrar arquivos inteiros como alterados. Os 28 arquivos foram normalizados para CRLF limpo, e o diff real ficou em 28 arquivos, +308/−33.
- **Fora do escopo (avisado, não corrigido):** F2 — `GET rehab-plan/[planId]` dá sempre erro 500, porque pede `createdBy.name`, campo que `User` não tem. É anterior à T-4.
- **QA (reteste 1):** os 21 pontos corrigidos passaram — 22 negativos com 404 e registro de B intacto, injeção de operador barrada e positivos gravando. O agente achou mais duas formas de escrever em B:
  1. o ramo `newItem` do `protocol` PATCH rodava antes da checagem de dono do protocolo;
  2. as ações de edição livre (`edit_screening`, `edit_foot_scan`, `edit_body_assessment`, `edit_document`, `edit_protocol_item` e o `itemUpdate` do protocolo) repassavam o corpo inteiro ao Prisma. Mandando `patientId`, `clinicId` ou `protocolId`, um staff **movia** um registro do próprio tenant para B.
- **Correção (rodada 2):** checagem de dono dentro do ramo `newItem`, e `withoutOwnership()` removendo `id`, `patientId`, `userId`, `clinicId` e `protocolId` das edições livres. A edição continua aceita; só os campos de dono são ignorados. Testes: 146/146.
- **QA (reteste 2):** os cenários pedidos passaram, mas o `withoutOwnership` (denylist) foi contornado: `{"patient":{"connect":{"id":"<alunoB>"}}}` moveu registro para B, e `{"uploadedBy":{"update":{"role":"SUPERADMIN"}}}` promoveu um usuário. Denylist não fecha a forma de relação do Prisma.
- **Correção (rodada 3):** `withoutOwnership` removido; edições livres passam por `pickEditable(modelo, corpo)` em `lib/tenant-field-guard.ts` — uma **allowlist** derivada do DMMF do Prisma, que mantém só as colunas escalares próprias do modelo. Relações, FKs, `id` e timestamps são descartados por nome, então nem `connect`/`update` aninhado nem troca de FK passam. Testes: 151/151.
