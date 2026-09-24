# T-1: Backend — expor e editar os campos de cadastro

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

`GET /api/admin/patients/[id]` passa a devolver os campos de cadastro
do paciente; `PATCH /api/admin/patients/[id]` ganha uma nova `action`
pra editá-los, com isolamento de tenant e auditoria.

## Contexto

- `app/api/admin/patients/[id]/route.ts` já isola por tenant via
  `staffPatientAccess(req, params.id)` (linha 19) e resolve
  `effectiveClinicId` a partir do próprio paciente (linha 133-135) —
  reaproveitar exatamente esse padrão, não inventar um novo.
- O dispatcher de `PATCH` já roteia por `body.action` (ver
  `add_clinical_note`, `edit_screening` etc.) — a nova action segue o
  mesmo formato: `if (body.action === "edit_registration") { ... }`.
- Referência de conversão de tipos (mesma lógica, mas SEM copiar a
  parte de auth): `app/api/patient/profile/route.ts:53-58` converte
  `dateOfBirth` string → `Date`; aqui a diferença é que string vazia
  também deve virar `null` (decisão do plan.md), não só `undefined`/
  `null` explícito.
- `logAudit` (`lib/system-logger.ts:98`) — chamar com `userId:
  patientId` (o registro afetado é o do paciente, igual ao padrão de
  `add_clinical_note`), `action: "PATIENT_REGISTRATION_UPDATED"`,
  `entity: "User"`, `entityId: patientId`, e `description` listando os
  campos alterados (não o valor completo, só os nomes dos campos —
  evita duplicar PII no log de auditoria).

## Passos

1. Em `GET`, adicionar ao `select` do `prisma.user.findUnique`:
   `address`, `dateOfBirth`, `emergencyContactName`,
   `emergencyContactPhone`, `emergencyContactRelation`.
2. Em `PATCH`, adicionar o branch `body.action === "edit_registration"`:
   - Campos aceitos: `firstName`, `lastName`, `phone`, `address`,
     `dateOfBirth`, `emergencyContactName`, `emergencyContactPhone`,
     `emergencyContactRelation`.
   - `firstName`/`lastName`: obrigatórios, não podem virar string
     vazia (mesma regra de qualquer cadastro — um paciente sem nome
     quebra listagens/e-mails em todo o resto do sistema).
   - Demais campos: string vazia ou `undefined` → não incluir no
     `data` de update (mantém o valor atual) se `undefined`; se vier
     `""` explicitamente, grava `null`.
   - `dateOfBirth`: parse pra `Date`; se a string não for uma data
     válida, `400` com mensagem clara (não deixar o Prisma estourar
     um erro opaco).
   - `prisma.user.update` com os campos resolvidos, `select` devolvendo
     os mesmos campos que o `GET` retorna (pra UI atualizar sem
     precisar recarregar a página toda).
   - `logAudit` com a lista de campos alterados (comparar antes/depois
     antes do update, só os nomes que realmente mudaram).
3. Testar via `curl`/script local que:
   - `GET` retorna os 5 campos novos (mesmo que `null`).
   - `PATCH edit_registration` atualiza corretamente e persiste `null`
     quando um campo é limpo.
   - `dateOfBirth` inválido devolve `400`.
   - Paciente de outra clínica devolve 403/404 (isolamento de tenant,
     reaproveitando `staffPatientAccess` — não deveria precisar de
     teste novo, mas confirmar que o branch novo não abriu um desvio).

## Arquivos afetados

- `app/api/admin/patients/[id]/route.ts`

## Critérios de aceite

- [ ] `GET` devolve `address`, `dateOfBirth`, `emergencyContactName`,
      `emergencyContactPhone`, `emergencyContactRelation`.
- [ ] `PATCH` com `action: "edit_registration"` atualiza os campos
      aceitos e ignora qualquer outro campo no body.
- [ ] Campo vazio (`""`) grava `null`; campo omitido não altera o
      valor atual.
- [ ] `firstName`/`lastName` vazios são rejeitados com `400`.
- [ ] `dateOfBirth` inválida é rejeitada com `400`, não estoura 500.
- [ ] `AuditLog` é criado com os nomes dos campos alterados (não os
      valores).
- [ ] Tenant isolation confirmado (staff de outra clínica não edita).
