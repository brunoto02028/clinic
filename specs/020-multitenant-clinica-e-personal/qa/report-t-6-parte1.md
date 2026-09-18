# QA Report — T-6 Parte 1: rotas críticas exploráveis hoje

**Data:** 2026-09-10
**Executado por:** agente qa-tester. A sessão principal gravou o relatório porque a escrita do agente foi bloqueada.
**Escopo:** Prioridade 1 da `qa/triagem-rotas.md` — impersonação entre tenants, rotas de admin alcançáveis por paciente, chaves de agente, foot-scan e checkout.
**Ambiente:** LOCAL, `http://localhost:4192` (`DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`, libs novas). Banco local. Prod não tocada.
**Método:** script Node sobre o módulo `http`, login NextAuth, cookies setados nos headers. Fixtures via `scripts/qa/tenant-fixtures.cjs`, ~1 req/s.
**Resultado geral:** ✅ **APROVADO** — 38/38 verificações, 0 falhas, 0 erros de servidor, 0 e-mails, cleanup limpo.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| IMP1 | Impersonação entre tenants bloqueada no consumo (`getEffectiveUser`) | API | ✅ (must-pass) |
| IMP2 | Iniciar impersonação por `POST /api/admin/impersonate` | API | ✅ |
| IMP3 | Cookie forjado por não-admin (paciente) | API | ✅ |
| EDU/SOC | Rotas de admin alcançáveis por paciente (education/social) | API | ✅ |
| AGENT | `agent-keys` restrita a SUPERADMIN | API | ✅ |
| FS | `foot-scans/[id]/progress` por dono/staff do tenant | API | ✅ |
| PAY | `payments/create-checkout` só do dono do agendamento | API | ✅ |
| REG | Impersonação intra-tenant funciona ponta a ponta | API | ✅ |
| Sink | `Sent via Resend` = 0 | Log | ✅ |
| Cleanup | throwaway + fixtures removidos | DB | ✅ |

## Detalhes

### IMP1 — impersonação entre tenants bloqueada (must-pass) ✅
Como `qa.admina` (ADMIN, A), sessão dela + cookie `impersonate-patient-id=<qa.aluno, B>`, chamando `GET /api/exercises` (passa por `getEffectiveUser`):
- **Baseline (sem impersonação):** `200 {"prescriptions":[]}`.
- **Cross-tenant (impersonando alunoB):** `200 {"prescriptions":[]}` — **idêntico ao baseline**; agiu como a própria admina, não retornou a prescrição de alunoB.
- **Intra-tenant (impersonando pacienteA, A):** `200` com a prescrição de pacienteA — a impersonação legítima é honrada.
Confirma o `patientInAdminTenant` em `lib/get-effective-user.ts`.

### IMP2 — iniciar impersonação pela rota ✅
`POST /api/admin/impersonate` como qa.admina: `{patientId: <alunoB>}` → **404 "Patient not found"**, sem setar cookie; `{patientId: <pacienteA>}` → **200** e cookie setado.

### IMP3 — cookie forjado por paciente ✅
qa.pacientea com `impersonate-patient-id=<pacientea2>` → `GET /api/exercises` retorna a prescrição da **própria** pacientea, não a de pacientea2. Paciente não impersona.

### EDU/SOC — rotas de admin alcançáveis por paciente ✅
- qa.aluno (PATIENT): GET/PUT/DELETE em education/content, social/posts e DELETE em social/templates → **403 "Forbidden"** em todas.
- qa.trainer (ADMIN B) contra registro de A → **404** com mensagem específica ("Content/Post/Template not found"); o template de A não foi apagado.
- qa.admina (A) no próprio tenant: GET → 200; PUT de post e DELETE de content/template throwaway → 200, gravação/remoção confirmadas no banco.
- Registros de B sobreviveram intactos às tentativas de escrita do aluno.

### AGENT — agent-keys só SUPERADMIN ✅
`GET /api/admin/agent-keys`: qa.admina (ADMIN) → **401**; qa.superadmin → **200**.

### FS — foot-scan progress ✅
FootScan de qa.aluno (B): qa.admina (A) → **404 "Scan not found"**; qa.trainer (B) → **200**; qa.pacientea (A, não-dono) → **404**.

### PAY — checkout ownership ✅
Agendamento de qa.aluno (B). qa.pacientea (A) → `POST /api/payments/create-checkout` → **404 "Appointment not found"**; nenhuma sessão Stripe nem `Payment` criado.

### REG — impersonação intra-tenant ✅
qa.admina inicia impersonação de qa.pacientea (A) → 200; com o cookie setado pela rota, `GET /api/exercises` retorna a prescrição de pacienteA.

## Sink e cleanup
- `Sent via Resend`: **0** no log inteiro. Nenhum 500.
- 11 registros throwaway removidos; `tenant-cleanup.cjs` → **leftover fixtures: 0**; verificação read-only final com 0 registros de QA.

## Falhas e recomendações
Nenhuma falha. Observação já registrada na tarefa: `agent-keys` acessa `session.user.role` sem cast, com erros de tipo preexistentes no HEAD (tolerados pelo build de prod); não afeta o runtime validado aqui.

**Veredito: APROVADO.**

## Code review (parte 1)
6 achados. **Nenhuma mudança de código foi necessária.**
- **#1 e #2 (descartados):** o revisor apontou falta de fallback para clínica nula em `staffAssessmentAccess` e `foot-scans/progress`. Verificado: `BodyAssessment.clinicId` e `FootScan.clinicId` são **não-nuláveis** no schema (o Prisma rejeita filtrar por null), então não há registro legado sem clínica para esconder. O `canAccessRecord` estrito está correto. Os fallbacks em SOAPNote/Appointment existem porque esses modelos têm `clinicId` nulável.
- **#4, #5 (performance):** resolução de identidade repetida em rotas de admin (guard + checagem própria; `getEffectiveUser` + `getActor`). Follow-up de otimização; sem risco de correção agora.
- **#6 (refatoração):** três guards parecidos (`staffAssessmentAccess`, `staffTenantRecord`, `staffUserAccess`). Unificar num helper genérico fica como follow-up; perdeu urgência porque #1/#2 (o motivo de tocar os três) caíram.

## Bug preexistente encontrado (fora do escopo — decisão do Bruno)
- **THERAPIST travado nas rotas de plano de reabilitação.** `app/api/admin/patients/[id]/rehab-plan/**` usa `const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"]`. "STAFF" não existe no enum `UserRole` (SUPERADMIN/ADMIN/THERAPIST/PATIENT), e THERAPIST não está na lista — então um fisioterapeuta recebe 401 em chat/generate/send/pre-assess do plano de reabilitação. **Confirmado idêntico no HEAD~5**, ou seja, anterior à atividade 20 e sem relação com isolamento por tenant. Não corrigido (regra: avisar, não consertar fora do escopo). Correção provável: trocar `"STAFF"` por `"THERAPIST"`. Aguardando decisão.
