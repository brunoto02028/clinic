# T-4: Prontuário por ID

**Status:** pendente
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
