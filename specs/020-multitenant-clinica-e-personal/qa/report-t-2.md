# QA Report — T-2: `lib/tenant-access.ts` + testes + fixtures de 2 tenants

**Data:** 2026-09-10
**Executado por:** agente qa-tester. O relatório foi gravado pela sessão principal porque a escrita do agente foi bloqueada.
**Ambiente:** banco local `bpr_clinic_local`, Node v25.5.0. Sem dev server, porque nenhuma rota muda nesta tarefa. Nenhum acesso a prod.
**Resultado geral:** ✅ **aprovado**. U1, U2 e S1 a S5 passaram, e o banco ficou limpo ao final.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | U1 — `npx jest __tests__/tenant` | Unit | ✅ 21/21 |
| 2 | U2 — `npx jest` (suíte inteira, regressão) | Unit | ✅ 12 suítes, 119/119 |
| 3 | S1 — Fixtures 2× (idempotência de IDs e contagens) | Script + DB | ✅ |
| 4 | S2 — Checagem dos dados das fixtures | DB (read-only) | ✅ |
| 5 | S3 — Os dois scripts recusam `DATABASE_URL` não local | Script | ✅ |
| 6 | S4 — Limpeza 2× sem sobras | Script + DB | ✅ |
| 7 | S5 — Escopo: só arquivos novos | Git | ✅ |

Ordem de execução: U1 → U2 → S3 (com o banco ainda vazio, o que prova que nada foi escrito) → S1 → S2 → S4 (último passo) → S5.

## Detalhes

### 1. U1 ✅
`Tests: 21 passed, 21 total`. Casos cobertos:
- **`getActor`:**
  - sem usuário → `null`;
  - conta desativada → `null`;
  - papel e tenant vêm do banco, não do token;
  - com impersonação, age como o paciente impersonado.
- **SUPERADMIN no `getActor`:**
  - cookie de uma clínica existente e ativa → trabalha nessa clínica;
  - cookie forjado → cai no tenant padrão;
  - várias clínicas e nenhuma padrão → `null`.
- **`getDefaultClinicId`:** usa a variável; slug inexistente → `null`; infere a única clínica ativa; recusa escolher entre várias.
- **`assertRecordAccess`:**
  - paciente só alcança o próprio registro;
  - staff só alcança registros do próprio tenant;
  - staff sem tenant nunca casa com um registro legado sem tenant.
- **`assertClinicAccess`:** só para staff e só no mesmo tenant.
- **`assertPatientAccess`:**
  - o paciente só alcança a si mesmo;
  - staff alcança pacientes do próprio tenant;
  - paciente de outro tenant fica oculto (404);
  - conta de staff não é tratada como paciente.
- **`tenantWhere`/`requireStaff`:** sem tenant → 403; paciente fora das operações de staff.

### 2. U2 ✅
`Test Suites: 12 passed` · `Tests: 119 passed`. Antes eram 98; a diferença são os 21 testes novos.

### 3. S1 — Idempotência ✅
- Duas execuções seguidas de `node scripts/qa/tenant-fixtures.cjs`, ambas com exit 0.
- `diff run1.json run2.json`: vazio, portanto os IDs são idênticos.

| Item | Após 1ª | Após 2ª |
|---|---|---|
| usuários `qa.*@example.test` | 8 | 8 |
| clínicas `qa-clinic-a`/`qa-studio-pt` | 2 | 2 |
| `BodyAssessment` `BA-QA-*` | 3 | 3 |
| agendamentos "QA fixture A/B" | 2 | 2 |
| notas SOAP "QA fixture" | 1 | 1 |
| exercícios QA | 2 | 2 |

### 4. S2 — Dados ✅
Consulta read-only: todos os papéis, tenants e registros conferem.
- **Usuários:**
  - `qa.admina` ADMIN, `qa.fisioa` THERAPIST reservável, `qa.pacientea` e `qa.pacientea2` PATIENT — todos no tenant A;
  - `qa.trainer` ADMIN reservável, `qa.aluno` PATIENT e `qa.pendente` PATIENT (inativo, sem `emailVerified`) — todos no tenant B;
  - `qa.superadmin` SUPERADMIN com `clinicId` nulo.
- **Registros:**
  - A1 e A2 no tenant A, B1 no tenant B;
  - nota SOAP, triagem e "QA fixture A" no tenant A; "QA fixture B" no tenant B;
  - disponibilidade de segunda a sexta com o `clinicId` do tenant certo.

### 5. S3 — Banco não local ✅
```
$ DATABASE_URL="postgresql://u:p@db.example.com:5432/x" node scripts/qa/tenant-fixtures.cjs
ABORT: DATABASE_URL is not a local database          exit code: 1
$ DATABASE_URL="postgresql://u:p@db.example.com:5432/x" node scripts/qa/tenant-cleanup.cjs
ABORT: DATABASE_URL is not a local database          exit code: 1
```
- A contagem logo em seguida continuava zerada, então nada foi escrito.
- A variável de ambiente tem precedência sobre o `.env`: uma URL remota exportada no shell é barrada, e não substituída pela local.

### 6. S4 — Limpeza ✅
- **1ª execução:** 3 avaliações, 1 nota SOAP, 1 triagem, 2 agendamentos, 1 prescrição, 2 exercícios, 10 disponibilidades, 8 usuários e 2 clínicas. Terminou com `leftover fixtures: 0` e exit 0.
- **2ª execução:** tudo 0, exit 0.
- **Consulta final:** zero para todos os tipos de fixture, inclusive `EmailMessage`, `passwordResetToken` e `verificationCode` (o R2 da T-1 está resolvido).
- **Totais gerais do banco:** idênticos ao estado anterior à rodada. A limpeza não tocou em nada que não fosse fixture.

### 7. S5 — Escopo ✅
- `git diff --stat HEAD`: só as duas specs de status.
- Arquivos novos: `lib/tenant-access.ts`, `lib/default-tenant.ts`, `__tests__/tenant/tenant-access.test.ts` e `scripts/qa/tenant-{fixtures,cleanup}.cjs`.
- Nenhum código existente foi alterado, e nenhuma rota importa o helper ainda.

## Falhas e recomendações
Nenhuma falha. Observações:

### O1 — No banco local não há tenant padrão
- **Situação:** o banco local tem 2 clínicas ativas (`bruno-physical-rehabilitation` e `bruno-physical-rehab`) e o `.env` não define `DEFAULT_CLINIC_SLUG`. Por isso `getDefaultClinicId()` devolve `null` e o SUPERADMIN sem cookie `selected-clinic-id` fica sem tenant.
- **Avaliação:** é o comportamento fechado esperado pela D5.
- **Para o QA local:** subir o dev server com `DEFAULT_CLINIC_SLUG` definido ou enviar o cookie.
- **Para prod:** antes do deploy da primeira rota que use `getActor`, confirmar que prod tem exatamente 1 clínica ativa ou definir `DEFAULT_CLINIC_SLUG`. Sem isso, o SUPERADMIN perde acesso às rotas migradas.

### O2 — A data dos agendamentos das fixtures fica congelada
- O `findOrCreate` reaproveita o agendamento já criado, então a data "próxima segunda" é fixada na primeira execução.
- Não afeta o uso normal, porque a limpeza roda ao fim de toda rodada.

### O3 — Lacuna pequena de cobertura unitária
- Faltam casos explícitos de SUPERADMIN em `assertRecordAccess` e `assertClinicAccess`.
- Falta o caso de paciente contra um registro com `patientId` nulo.

### O4 — Suíte duplicada vinda de `reconstruir/` (pré-existente, fora do escopo)
- O `testMatch` do Jest inclui a pasta `reconstruir/`, que está no `.gitignore`.
- Isso soma 12 testes que não pertencem ao projeto.

**Veredito: APROVADO.**

---

## Ações da sessão principal após o QA
- **O3:** acrescentados os casos de SUPERADMIN (age como staff dentro do próprio tenant) e de paciente contra registro sem dono.
- **O1:** registrado para o push. Em prod hoje existe 1 clínica ativa, que é inferida, então nada muda. Antes do segundo tenant, definir `DEFAULT_CLINIC_SLUG` no servidor. Os QAs locais a partir da T-3 sobem o dev server com a variável.
- **O4:** avisado, não corrigido (fora do escopo).

## Code review e correções
- **Achado 1 (baixo):** a allowlist não servia para e-mail de template, porque o admin vai sempre em BCC. Corrigido em `lib/email.ts`: as cópias fora da lista são removidas e registradas como `[OUTBOUND-SINK] email → … : bcc of: …`. Testes novos cobrem "trims copies outside the allowlist" e "sends in production, copies included".
- **Achado 2 (baixo):** a data dos agendamentos das fixtures congelava. Corrigido: a data é atualizada a cada execução e o ID não muda.
- **Reteste:** 122/122 testes. Fixtures rodadas 2× com IDs idênticos; "QA fixture A/B" em 2026-09-14 (no futuro). Limpeza com 0 sobras.
