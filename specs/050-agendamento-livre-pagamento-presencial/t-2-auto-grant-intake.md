# T-2: Auto-grant de acesso ao agendamento no intake

**Status:** concluído
**Depende de:** nenhuma (independente de T-1)

## Objetivo
Todo paciente que completa o cadastro via link de convite já sai com acesso liberado ao
agendamento de consulta — sem o admin precisar liberar manualmente em
`/admin/service-pricing`.

## Contexto
Ver decisão D2 e suposições 1–2 em `plan.md`. Hoje `AssessmentGate` (usado em
`app/dashboard/appointments/page.tsx`) bloqueia quem não tem
`ServiceAccess { serviceType: CONSULTATION, granted: true }` (ver
`components/dashboard/assessment-gate.tsx:83`, `app/api/patient/status/route.ts:37-115`). O
padrão de upsert já existe em `app/api/admin/service-access/route.ts:52-77` — esta tarefa
replica a mesma lógica, disparada pelo próprio `POST /api/intake/[token]` em vez de um clique
do admin.

Só aplica no primeiro `POST` bem-sucedido (quando o token ainda é válido e é invalidado no
mesmo request) — não roda de novo em edições posteriores de perfil.

## Passos
1. Em `app/api/intake/[token]/route.ts`, dentro do `POST` (depois do
   `prisma.user.update(...)` que já existe, linha ~157-160), adicionar upsert de
   `ServiceAccess`:
   ```ts
   await prisma.serviceAccess.upsert({
     where: { patientId_serviceType: { patientId: user.id, serviceType: "CONSULTATION" } },
     update: {}, // já existe (ex.: admin liberou antes) — não sobrescreve
     create: { patientId: user.id, serviceType: "CONSULTATION", granted: true, paid: false },
   });
   ```
   Checar se existe `@@unique([patientId, serviceType])` em `ServiceAccess` no schema — se não
   existir, usar `findFirst` + `create`/`update` no mesmo padrão de
   `app/api/admin/service-access/route.ts:52-77` em vez de `upsert` (mais simples que adicionar
   um `@@unique` novo só para isso).
2. Não falhar o cadastro se esse passo der erro — envolver em try/catch e logar, igual ao
   padrão já usado nas notificações de e-mail em `app/api/appointments/route.ts:210-232`
   (cadastro do paciente não pode quebrar por causa disso).

## Arquivos afetados
- `app/api/intake/[token]/route.ts`

## Critérios de aceite
- [x] Completar o intake de um paciente de teste cria (ou mantém) um `ServiceAccess` com
      `granted: true` para `CONSULTATION`.
- [x] Paciente que já tinha `ServiceAccess` (liberado manualmente antes) não é afetado/duplicado.
- [x] Erro nesse passo não impede o `200 { success: true }` do cadastro (verificado por revisão
      de código — try/catch sem `throw`).
- [x] `npx tsc --noEmit` e `npx next lint` limpos no arquivo.

## Achado do QA e correção (17/09/2026, mesma implementação)

O QA encontrou que `/dashboard/appointments` tem **dois gates independentes**, não só o
`AssessmentGate` (`ServiceAccess.CONSULTATION`) que esta tarefa libera:

- `ModuleGate` (`components/dashboard/module-gate.tsx`), aplicado a **todo** `/dashboard/*` via
  `components/dashboard/dashboard-layout.tsx:148`, bloqueia por módulo (`mod_appointments`) —
  independente de `ServiceAccess`. `mod_appointments` só é concedido por assinatura ativa,
  pacote de tratamento pago (`hasActiveTreatment`), ou override manual do admin
  (`lib/patient-access.ts:57-73`) — **não** é um dos `ALWAYS_VISIBLE_MODULES`.
- Sem esse módulo, o paciente cai numa tela "Upgrade your plan..." **antes** de sequer chegar
  no `AssessmentGate` — ou seja, o objetivo #1 do `plan.md` não era cumprido só com o grant de
  `ServiceAccess`.

**Correção**: `POST /api/intake/[token]` agora também grava
`moduleOverrides: { ...existentes, mod_appointments: true }` no `User` (mesmo padrão de valor
usado pelo admin em `app/api/admin/patients/[id]/permissions/route.ts`), mesclando com
overrides pré-existentes em vez de sobrescrever.
