# QA — Paridade **app do paciente → admin**

**Data:** 24/09/2026 · **Ambiente:** worktree `app_clinic`, `http://localhost:4010` (PID confirmado)
**Dados:** prefixo `qa-par2-` — 2 clínicas, 2 staff, 2 pacientes. Removidos ao final.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — os dados chegam ao banco com tenant correto na
maioria dos casos, mas 3 falhas altas faziam o paciente agir sem que a clínica visse.

Metade app → admin; a ida está em `report-paridade-admin-app.md`. Sem emulador: cada ação foi
executada **pela mesma rota que o app chama**, com bearer do paciente, e lida pelas rotas que as
telas do admin consomem.

## A matriz

| # | Ação no app | Onde a clínica deveria ver | Aparece? |
|---|---|---|---|
| 1 | Check-in diário | painel de aderência | ❌ o painel não lê check-in |
| 1b | " | aba de atividade | ❌ → **corrigido** (F-3) |
| 1c | " | relatório | ✅ |
| 2 | Marcar exercício | painel de aderência | ❌ → **corrigido** (F-1) |
| 2c | " | `completions` do relatório | ✅ |
| 3 | Registrar pressão | aba de pressão | ✅ |
| 3b | " | **alerta** ao cruzar o limiar | ❌ → **corrigido** (F-2) |
| 4 | Enviar mensagem | aba de mensagens + badge | ✅ |
| 5 | Subir documento | aba de documentos | ✅ (mas o app não sobe — F-10) |
| 6 | Responder triagem | triagem do prontuário | ✅ |
| 7 | Medidas de evolução | relatório | ✅ (não há aba — F-7) |
| 8 | Pedir consulta | agenda do admin | ✅ |
| 9 | Aceitar o aviso (T-13) | `ConsentLog` | grava; **nenhuma tela mostra** (F-5) |
| 10 | Conectar/desconectar aparelho | `/admin/biohacking` | ✅ (nada no prontuário — F-8) |
| 11 | Responder tarefa | lista de tarefas | ✅ (não há aba no prontuário — F-6) |
| — | Escopo de tenant, nos dois sentidos | — | ✅ limpo |

---

## F-1 — 🔴 ALTA · O exercício concluído **hoje** não contava; o de **ontem** contava

```
PATCH /api/exercises  (bearer do paciente) → 200, "marked":true, "date":"2026-09-24"
GET  /api/admin/patients/<p>/adherence-today
  → {"missing":[{"title":"qa-par2-exercicio"}]}      ← diz que falta
```

**Mecanismo, isolado pelo QA:** `completedDate` é `@db.Date`; o write grava meia-noite **UTC**, e o
read montava a janela com `setHours(0,0,0,0)` — meia-noite **local**. Com o servidor em
Europe/London (BST) a janela virava `23:00Z → 23:00Z`, e o Postgres truncava as duas pontas para
DATE: `>= '2026-09-23' AND < '2026-09-24'`, ou seja **ontem**. A mesma consulta em SQL cru, com os
mesmos limites, achava a linha.

Confirmação do off-by-one: com uma conclusão datada de ontem, o painel passou a dizer que **hoje**
estava tudo feito.

Atingia o painel por paciente, o card da clínica e o **e-mail diário de aderência** — todos passam
por `getExpectedToday`.

**Corrigido:** `startOfDay` passou a derivar o dia do jeito que o write deriva (data de Londres →
meia-noite UTC), com quatro testes que prendem as duas pontas, incluindo o caso de madrugada, que é
onde o fuso separa os dias.

## F-2 — 🔴 ALTA · Pressão que cruzava o limiar não deixava rastro na tela do admin

```
POST /api/patient/blood-pressure  {"systolic":195,"diastolic":125} → 200
GET  /api/patient/exercise-clearance → {"state":"BLOCKED"}     ← o caminho rodou
GET  /api/alerts (staff da clínica)  → {"alerts":[],"openCount":0}
```

`lib/bp-alerts.ts` só mandava e-mail. A única origem de linhas em `Alert` era o cron de aderência.
Se o e-mail falhasse, caísse em spam ou o tenant não tivesse endereço, **uma crise hipertensiva
entrava no prontuário em silêncio** — e a tela feita para isso dizia "nenhum alerta".

**Corrigido:** toda leitura que cruza o limiar cria um `Alert`, com a deduplicação por dia que a
072 já tinha. Provado:

```
1) 195/125 → alerta criado, ruleCode BP_CRISIS, priority URGENT, status OPEN
2) segunda leitura no mesmo dia → continua 1 alerta
3) leitura normal (118/74) → nenhum alerta
```

## F-3 — 🔴 ALTA · Check-in não chegava à aba de atividade

O feed de `/api/admin/patients/[id]/activity` montava exercícios, auditoria, mensagens, triagem e
documentos — `DailyCheckIn` não entrava. Para quem abre o prontuário e vai direto em "Atividade", o
paciente que fazia check-in todo dia parecia inativo.

**Corrigido:** o check-in entra no feed, com dor, humor e o que a pessoa escreveu — que é a parte
que o terapeuta lê.

**Ainda em aberto:** o painel de aderência continua medindo só exercício. É decisão de produto:
check-in entra na definição de aderência, ou o painel diz claramente que mede só exercício?

## F-9 — 🟡 MÉDIA → corrigida · Registros criados pelo app **sem `clinicId`**

```
POST /api/patient/messages   → {"clinicId":null,…}
POST /api/medical-screening  → {"clinicId":null,…}

medicalScreening.count({clinicId})        = 0
medicalScreening.count({user:{clinicId}}) = 1
```

Não quebrava as telas (elas leem por `patientId`, com o tenant garantido acima), mas **já quebrava
um contador em produção**: `lib/command-context.ts` conta triagens por `clinicId` e reportava zero
para toda triagem vinda do paciente.

**Corrigido** nos dois caminhos (paciente e staff), mais um backfill idempotente que roda no boot e
só preenche nulos. Local: 13 mensagens e 1 triagem preenchidas, 0 restantes.

## F-4 a F-13 — as demais

- **F-4** o card de aderência da clínica só varre pacientes **com protocolo**: quem recebeu
  exercício avulso nunca entra nele nem no e-mail diário. Duas telas discordando sobre o mesmo
  paciente. **Não corrigido** — decisão de produto.
- **F-5** o aceite do aviso (T-13) grava e **nenhuma tela do admin mostra**. É registro jurídico;
  a pergunta "este paciente aceitou? qual versão? quando?" não tem onde ser respondida.
- **F-6 / F-7 / F-8** faltam superfícies no prontuário: tarefas, evolução (EVA/FAAM) e estado do
  aparelho.
- **F-10** o app **não sobe documento** (só lê) — `mobile/src/api/documents.ts` não tem upload.
- **F-11** o app pede consulta mas não confirma nem cancela.
- **F-12** `documentType` inválido devolvia **500 com o erro cru do Prisma**, incluindo ids
  internos e o **base64 do arquivo** no corpo. **Não corrigido** — vale um 400 e um corpo limpo.
- **F-13** `/api/wearables/connect/<provider>` cria a linha de conexão antes do OAuth terminar;
  quem abandona deixa lixo `DISCONNECTED`.

## Escopo de tenant — limpo

Staff da clínica B contra paciente da A: `404` em prontuário, atividade, pressão, mensagens,
documentos, aderência e relatório; listas vazias no resto. Paciente B escrevendo no prontuário de
A: `404` em tarefa, prescrição, consulta e arquivo, com a linha alvo intacta. Bearer de paciente em
rota de admin: bloqueado pelo middleware.
