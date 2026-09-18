# QA — T-2: Auto-grant de acesso ao agendamento no intake

**Resultado: ✅ aprovado** (após correção de um achado durante o próprio QA)

Ambiente: local (`npm run dev` na porta 4001 — a 4000 padrão estava ocupada por outro
projeto —, banco `bpr_clinic_local`, sem tocar produção nem enviar e-mail real).

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | Novo paciente completa intake → `ServiceAccess.CONSULTATION` criado | API | ✅ |
| 2 | Paciente com `ServiceAccess` prévio → não duplica | API | ✅ |
| 3 | Erro no upsert não quebra o cadastro | API | ✅ (revisão de código) |
| 4 | Paciente novo acessa `/dashboard/appointments` sem nenhum paywall | UI | ✅ (após correção) |

## Evidências

### 1. Auto-grant para paciente novo ✅
```
curl -X POST http://localhost:4001/api/intake/b31a4991...
→ 200 {"success":true,"message":"Profile updated successfully"}
```
`qa-intake-new@example.com` passou a ter exatamente 1 registro em `ServiceAccess`
(`serviceType: CONSULTATION, granted: true, paid: false`), criado no mesmo instante da chamada.
Confirmado também via `GET /api/patient/status`: `"serviceAccess": {"CONSULTATION": true, ...}`.

### 2. Não duplica quando já havia acesso ✅
Paciente de teste com `ServiceAccess.CONSULTATION` concedido manualmente **antes** de completar
o intake → depois do `POST /api/intake/[token]` (200 OK), continua com **exatamente 1** registro
de `ServiceAccess`, mesmo `createdAt` de antes — confirma que o `findFirst` + guarda evitou
duplicata.

### 3. Erro no upsert não quebra cadastro ✅ (revisão de código)
Não foi forçado um erro real em runtime (exigiria mockar o Prisma, fora do escopo de teste
black-box). Confirmado por leitura do código que o trecho está em `try/catch` com
`console.error`, sem `throw`, antes do `return NextResponse.json({ success: true, ... })`.

### 4. Achado durante o QA e correção — agora ✅

Na primeira rodada, o QA encontrou que `/dashboard/appointments` tem **dois gates
independentes**: o `AssessmentGate` (`ServiceAccess.CONSULTATION`, o que esta tarefa concede) e
um `ModuleGate` pré-existente e completamente separado (`mod_appointments`, aplicado a todo
`/dashboard/*`), que só libera o módulo com assinatura ativa, pacote pago, ou override manual —
nada a ver com `ServiceAccess`. Um paciente novo, mesmo com o grant desta tarefa, ficava preso
nesse segundo paywall ("Upgrade your plan...") e nunca chegava a ver a tela de agendamento.

**Correção aplicada**: `POST /api/intake/[token]` passou a também gravar
`moduleOverrides: { ...existentes, mod_appointments: true }` no `User`, mesclando com overrides
pré-existentes (mesmo padrão de valor usado pelo admin em
`app/api/admin/patients/[id]/permissions/route.ts`).

**Reteste após a correção**:
1. Paciente novo criado com `moduleOverrides` pré-existente `{ some_other_flag: true }`
   propositalmente, pra testar o merge com rigor.
2. `POST /api/intake/[token]` → `200`.
3. Banco depois: `moduleOverrides: { some_other_flag: true, mod_appointments: true }` — merge
   correto, sem apagar o override anterior.
4. Login como essa paciente → `/dashboard/appointments` carrega direto a tela real de
   Agendamentos (sidebar "Sessões" sem cadeado, "Agendar Consulta"/"Lista de Espera" visíveis),
   sem nenhum dos dois paywalls. Zero erros de console.
   Screenshot: `qa/screenshots/t-2-fix-mod-appointments-liberado.png`.

O achado está resolvido e verificado de ponta a ponta.
