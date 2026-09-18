# QA Report — T-2: Rota do invoice cria pendente em vez de enviar

**Data:** 2026-09-14
**Ambiente:** local (`bpr_clinic_local`, `http://localhost:4000`) — produção não foi tocada.
**Login usado:** `qa.admina@example.test` (ADMIN, senha local resetada só para este QA — ver
nota de segurança no final).
**Resultado geral:** ✅ aprovado (com uma ressalva sobre cenário não testável — ver item 4)

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `POST /invoice` em consulta válida → `{success, pendingId, invoiceNumber}`, sem email real | API | ✅ |
| 2 | Item aparece em `GET ?folder=PENDING_APPROVAL` com dados corretos | API | ✅ |
| 3 | `POST /invoice` em consulta inexistente → 404, nada criado | API | ✅ |
| 4 | `POST /invoice` em consulta cujo paciente não tem email → 400, nada criado | API | ✅ |
| 5 | `GET /invoice` (prévia HTML) continua funcionando sem mudança | API | ✅ |

## Setup de teste
Fixtures criados via script Prisma direto (não pela UI, para não disparar efeitos colaterais de
booking/Stripe/notificação irrelevantes ao teste): paciente `qa39-patient-<ts>@example.com`
("QA39 TestPatient") e uma consulta de teste (`treatmentType: "QA39 Test Treatment"`,
`price: 100`) vinculados a um therapist já existente no banco local. Todos os dados de teste
(pacientes, consultas, `EmailMessage`s) foram apagados ao final — ver seção de limpeza.

## Detalhes

### 1. `POST /invoice` em consulta válida — sem disparo de email real ✅
- **Comando:**
  ```
  curl -X POST http://localhost:4000/api/admin/appointments/<id-consulta-teste>/invoice \
    -H "Content-Type: application/json" -d '{}'
  ```
- **Antes:** `folderCounts.SENT = 7`
- **Resposta:** `200 OK` — `{"success":true,"pendingId":"cmu1dxnzf0005xz8op61muo8m","invoiceNumber":"BPR-20260914-86DMSZ"}`
- **Depois:** `folderCounts.SENT = 7` (inalterado), `folderCounts.PENDING_APPROVAL = 1`
- Formato da resposta bate exatamente com o especificado (`success`, `pendingId`,
  `invoiceNumber`), sem nenhum campo de envio.

### 2. Item pendente com dados corretos ✅
- **Comando:** `GET /api/admin/email?folder=PENDING_APPROVAL`
- **Resultado:**
  ```json
  {
    "id": "cmu1dxnzf0005xz8op61muo8m",
    "toAddress": "qa39-patient-1789398835591@example.com",
    "subject": "Invoice BPR-20260914-86DMSZ — Bruno Physical Rehabilitation",
    "templateSlug": "INVOICE",
    "folder": "PENDING_APPROVAL",
    "patientId": "cmu1dv62w0001xz28l1acyl1p",
    "hasAttachments": true
  }
  ```
  `toAddress` é o email do paciente de teste, `subject` inclui o número da invoice certo,
  `attachmentsJson` presente (o iframe de preview na UI, testado no T-4, renderizou o HTML
  decodificado corretamente com o valor £100.00 e o nome do paciente).

### 3. Consulta inexistente → 404 ✅
- **Comando:** `POST /api/admin/appointments/nonexistent-id-123/invoice`
- **Resultado:** `404 Not Found` — `{"error":"Appointment not found"}`
- Confirmado que `folderCounts.PENDING_APPROVAL` continuou em 1 depois dessa chamada (nenhum
  `EmailMessage` foi criado).

### 4. Consulta cujo paciente não tem email → 400 ✅ (cenário adaptado)
O schema `User.email` é `String @unique` (não-nullable) — não é possível ter um paciente com
`email: null` no banco. Para exercitar o branch `if (!result.patientEmail)` da rota (que trata
email "falsy"), criei um paciente de teste com `email: ""` (string vazia é permitida pelo
schema, não fere a constraint de unicidade, e é falsy em JS — exatamente a condição que a rota
verifica).
- **Comando:** `POST /api/admin/appointments/<id-consulta-sem-email>/invoice`
- **Resultado:** `400 Bad Request` — `{"error":"Patient has no email on file"}`
- Confirmado que `folderCounts.PENDING_APPROVAL` não mudou (nenhum `EmailMessage` criado).
- **Nota:** o cenário literal da qa-spec ("paciente sem email") não é construtível com
  `email: null` por causa da constraint do schema; usei `email: ""` como equivalente prático já
  que é o único jeito de exercitar esse branch de validação com dado real.

### 5. `GET /invoice` (prévia) sem mudança ✅
- **Comando:** `GET /api/admin/appointments/<id-consulta-teste>/invoice`
- **Resultado:** `200 OK`, `Content-Type: text/html`, HTML da invoice renderizado normalmente
  (mesmo comportamento de antes da atividade 39).

## Erros de console
Não aplicável (T-2 é só API).

## Falhas e recomendações
Nenhuma falha. Tudo conforme o especificado no plan.md e na task.

## Limpeza
Paciente(s), consulta(s) e os `EmailMessage`s gerados nesses testes foram apagados do banco
local ao final de todo o QA da atividade (ver `report-t-4.md`, seção de limpeza, para o
resumo consolidado).

## Nota de segurança (credenciais de teste)
Login usado para todo o QA desta atividade: `qa.admina@example.test`. A senha local desse
usuário de QA foi **resetada** (para `Qa39Temp#2026!`, só no banco `bpr_clinic_local`) porque
as credenciais originalmente passadas (`admin@bpr.clinic` / `Bruno@Admin2026!`) não existiam
nesse banco local. Autorizado pelo coordenador da sessão. Não é uma conta real de produção — é
uma conta de QA (`role: ADMIN`, `email: qa.admina@example.test`) já usada para testes
anteriores neste projeto. A senha **não foi revertida** para o hash original (não fazia
sentido, já que é conta de teste) — se alguém precisar logar como esse usuário de QA depois,
a senha agora é `Qa39Temp#2026!` no ambiente local.
