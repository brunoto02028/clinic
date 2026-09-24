# QA — Paridade **admin → app do paciente**

**Data:** 24/09/2026 · **Ambiente:** worktree `app_clinic`, `http://localhost:4010` (PID confirmado), banco `bpr_clinic_local`
**Dados:** prefixo `qa-par1-` — 2 clínicas, 2 staff, 3 pacientes fictícios. Removidos ao final.
**Resultado geral:** ❌ **reprovado** — 1 falha crítica, 4 altas, 5 médias, 5 baixas.
**Atualização 24/09:** F3 e F4 corrigidas — ver `report-gate-servidor.md`.

Pedido do Bruno: *"reveja com o QA se todos os comandos dentro do admin vão refletir corretamente
dentro do APP e vice-versa"*. Esta é a metade admin → app; a volta está em
`report-paridade-app-admin.md`.

**Limite desta auditoria:** não há emulador, então o app **não foi dirigido**. Cada ação foi
executada pela API do admin e relida pela **rota que o app consome**, com bearer do paciente, nos
mesmos campos que `mobile/src/api/*.ts` declara. O que é conclusão por leitura de código está
marcado **[por inspeção]**.

## A matriz

| # | Ação no admin | Rota que o app lê | Bate? |
|---|---|---|---|
| 1 | Atribuir/editar protocolo | `/api/patient/protocol` | ⚠️ dado ✅, **tela quebrava** (F1) |
| 2 | Prescrever exercício | `/api/exercises` | ⚠️ valor ✅, **escrita cross-tenant** (F0) |
| 3 | Registrar pressão pelo prontuário | `/api/patient/blood-pressure` | ⚠️ parcial (F7) |
| 4 | Criar / remarcar / cancelar consulta | `/api/appointments` | ✅ |
| 4d | Bloco de sessões (`PENDING_PATIENT`) | `/api/appointments` | ❌ o app não confirma (F9) |
| 5 | Enviar mensagem | `/api/patient/messages` | ✅ (com F12) |
| 6 | Subir documento | `/api/patient/documents` | ❌ **não abria** (F2) |
| 7 | Criar tarefa | `/api/patient/tasks` | ✅ |
| 8 | Nota SOAP visível ao paciente | `/api/patient/clinical-notes` | ⚠️ o controle não existe (F10) |
| 9 | Medidas de evolução | `/api/patient/outcome-measures` | ⚠️ a ação não existe no admin (F11) |
| 10 | Ligar/desligar `mod_*` | `/api/patient/access`, `/api/mobile/modules` | ✅ → **corrigido** (F4) |
| 11 | Trocar o idioma do paciente | várias | ⚠️ parcial (F6) |
| 12 | Editar nome/dados | `/api/patient/profile` | ✅ |
| 13 | Treino e nutrição | `/api/mobile/workouts`, `/meal-plans` | ✅ |
| 14 | Medição do aparelho da clínica (T-15) | `/api/patient/blood-pressure` | ✅ |
| — | Consentimento pendente | todas | ✅ → **corrigido** (F3) |
| — | Cache do app depois da mudança | todas | ❌ [por inspeção] (F5) |
| — | Isolamento entre pacientes | todas | ✅ |
| — | Paciente transferido de clínica | várias | ❌ (F8) |

> A matriz pedia `/api/patient/appointments`, mas o app lê **`/api/appointments`**
> (`mobile/src/api/appointments.ts:15`). As duas foram testadas.

---

## F0 — 🔴 CRÍTICO · Staff de outra clínica reescrevia e **roubava** a prescrição de um paciente

`PATCH /api/admin/exercise-prescriptions` conferia **só o papel** e espalhava o body inteiro em
`data`:

```ts
const { id, ...updateData } = body;
const prescription = await prisma.exercisePrescription.update({ where: { id }, data: updateData });
```

Clínica B editando a prescrição de um paciente da clínica A:

```
PATCH … {"id":"<presc de A>","sets":99,"reps":99,"notes":"qa-par1 EDITADO PELA CLINICA B"}
→ HTTP 200
GET /api/exercises (Bearer do paciente A) → {"sets":99,"reps":99,"notes":"… CLINICA B"}
```

E movendo para o paciente dela:

```
PATCH … {"id":"<presc de A>","patientId":"<paciente B>","clinicId":"<clínica B>"} → 200
GET /api/exercises (paciente B) → 1 item   ← ganhou o exercício
GET /api/exercises (paciente A) → 0 itens  ← perdeu, sem rastro
```

**Corrigido:** o `PATCH` passou a resolver a clínica da sessão, buscar a prescrição **dentro dela**
(404 quando é de outro tenant, como o resto do admin) e aceitar só uma lista fechada de campos —
`patientId` e `clinicId` não estão nela, porque mover uma prescrição entre pacientes não é uma
edição.

## F1 — 🔴 ALTA · A tela do plano de tratamento quebrava ao desenhar `goals` e `precautions`

O servidor entrega o que o schema guarda: `goals` é `[{goal, phase, timeline, metrics}]` e
`precautions` é `[{precaution, severity}]`. O app renderizava cada entrada como texto, e os tipos
do cliente diziam `string[]`/`string`, então o TypeScript não pegava.

```
payload real: "goals": [{"goal":"qa-par1 reduce pain","phase":"SHORT_TERM",...}]
React:        THREW: Objects are not valid as a React child (found: object with keys {goal, phase, …})
```

Vale para **todo plano gerado pela IA**, que sempre traz `goals`.

**Corrigido:** os tipos passaram a dizer a verdade (`unknown[]`), e a tela lê por `readEntry()` /
`toPrecautionLines()`, que aceitam objeto, string ou lista.

## F2 — 🔴 ALTA · O documento enviado pela clínica aparecia no app e **não abria**

Duas coisas somadas: `fileUrl` é relativo (`/api/files/<id>`), e `Linking.openURL` de um caminho
sem esquema rejeita — com `.catch(() => {})` engolindo. Mesmo absoluto, `/api/files` não estava em
`MOBILE_API_PREFIXES` e o visualizador do sistema não carrega sessão nenhuma:

```
curl -H "Authorization: Bearer <paciente>" …/api/files/<id> → 307 → /login
curl -b <cookie do paciente>              …/api/files/<id> → 200
```

**Corrigido, em três partes:** `/api/files` entrou nos prefixos móveis; `/api/files/[id]` passou a
aceitar um **link assinado, curto e preso ao arquivo e à pessoa**
(`lib/file-access-token.ts`, mesmo padrão do state do OAuth); e `/api/patient/documents` devolve
`openUrl` absoluto com esse token. A tela deixou de engolir o erro: quando não dá para abrir, diz.

Prova do token:

```
1) abre o próprio arquivo: SIM ✓
2) o MESMO token abre outro arquivo? não ✓
3) token adulterado: recusado ✓   4) sem token: recusado ✓   5) expirado: recusado ✓
```

## F3 — 🔴 ALTA · Consentimento pendente: a web tranca o portal, o app não tranca nada

Com `consentAcceptedAt = null`, a web mostra a parede *"Terms & Consent Required"* e bloqueia todo
o `/dashboard`. No mesmo instante, com o token do mesmo paciente, o app lê documentos, tarefas,
mensagens, pressão e consultas — todos 200. Nenhuma tela do app checa `consentAccepted`; o
`PlanGate` só olha módulos.

**Corrigido** (24/09, depois do "pode fazer o gate no servidor"): guard compartilhado
`lib/patient-gate.ts` como primeira instrução de 48 rotas de paciente. Prova e o que o QA achou no
caminho — o aceite vivia em duas colunas, e ligar o gate sem unificá-las trancaria o app — em
`report-gate-servidor.md`.

## F4 — 🔴 ALTA · O módulo revogado não é aplicado no servidor (33 de 35 rotas)

O cálculo está certo: `/api/patient/access` e `/api/mobile/modules` reagem na hora ao que o admin
marca. A recusa é que não existe. Só `protocol`, `clinical-notes` e `/api/exercises` chamam
`assertModuleAccess`:

| rota | módulo revogado | resposta ao bearer do paciente |
|---|---|---|
| `/api/patient/protocol` | `mod_treatment` | `403` ✅ |
| `/api/patient/documents` | `mod_documents` | **200, documento inteiro** ❌ |
| `/api/patient/tasks` | `mod_tasks` | **200** ❌ |
| `/api/patient/messages` | `mod_messages` | **200** ❌ |

O `PlanGate` esconde a tela — e o próprio comentário dele avisa que não é fronteira de segurança.
O que faltava dizer é que a fronteira do servidor também não existe para 33 rotas.

**Corrigido** junto com F3, pelo mesmo guard: a rota declara o `mod_*` que serve e um módulo fora do
plano responde `403 module_not_in_plan`. O app passou a distinguir esse 403 do de consentimento,
porque só um dos dois o paciente pode resolver sozinho.

## F5 — 🔴 ALTA [por inspeção] · Nada no app invalida o que o admin muda

`staleTime: 0` + `refetchOnMount` só atualiza quando a tela **desmonta e remonta** — e as tabs
nunca desmontam durante a sessão. Não há `AppState`, `focusManager`, NetInfo nem push: as 17
`invalidateQueries` existentes são todas disparadas por ação do próprio paciente.

Congelados por sessão: home (`appointments`, `prescriptions`, `protocols`, `messages`),
`exercise-clearance`, `modules`, `patient-access`, notas clínicas, notificações.

**Dois bugs concretos, corrigidos:**
- `daily-checkin.tsx` invalidava `["patient-progress"]`, chave que **nenhuma query usa** → agora
  `["assessment-progress"]`;
- salvar pressão não invalidava `["exercise-clearance"]`, que é derivada exatamente da pressão que
  acabou de ser salva → agora invalida.

O resto (refrescar ao voltar para o app) é mudança de arquitetura e fica para decidir.

## F6 — 🟡 MÉDIA · Trocar o idioma não traduz o protocolo nem as notas SOAP

Interface, tarefas e exercícios trocam de idioma na hora. Mas `ProtocolItem` e `SOAPNote` **não têm
coluna em português**, e `TreatmentProtocol.language` é decidido na atribuição e nunca mais muda.
Paciente cadastrado em inglês e corrigido depois fica com menus em português e o corpo do plano em
inglês. **Não corrigido** — precisa de decisão (traduzir na atribuição? campo por item?).

## F7 — 🟡 MÉDIA · Pressão medida na clínica era gravada como se fosse de casa

`POST /api/admin/patients/[id]/blood-pressure` não gravava `source`/`context`, então caía nos
defaults `MANUAL`/`HOME` — numa medida feita na maca. Ia assim para o relatório e para as médias.

**Corrigido:** grava `source: MANUAL` e `context: OTHER` ("outro" é honesto; `HOME` não era). O
formulário ainda não pergunta antes/depois — ao contrário do botão do aparelho, que pergunta.

## F8 — 🟡 MÉDIA · Paciente transferido de clínica continua lendo o histórico da anterior

Protocolo, notas, treino e nutrição filtram por `clinicId` e devolvem 0 ✅. Exercícios, documentos,
tarefas, mensagens, pressão e consultas filtram só por `patientId` e continuam entregando o
histórico da clínica antiga. **Isolamento entre pacientes está sólido** — a brecha é o registro do
próprio paciente não ser re-escopado quando o tenant dele muda. **Não corrigido:** exige decidir o
que acontece com o histórico numa transferência.

## F9 a F15 — menores, não corrigidos

- **F9** o app não confirma o bloco de sessões (`confirm-schedule` não existe em `mobile/`);
- **F10** não existe controle de visibilidade por nota SOAP — é tudo ou nada pelo módulo;
- **F11** não existe rota admin que grave medidas de evolução; só o paciente grava;
- **F12** mensagens de staff nasciam com `clinicId: null` → **corrigido**, com backfill no boot;
- **F13** o mesmo documento mostra `createdAt` na web e `documentDate` no app;
- **F14** `Workout.notes` e `restSeconds` são gravados e nenhuma tela lê;
- **F15** consulta online (`videoRoomUrl`) não aparece para o paciente em nenhum dos dois.

## O que passou, e passou bem

Protocolo (visibilidade, `hiddenFromPatient`, `releasedThroughWeek`), prescrição (valores e
`namePt`), consultas (criar/remarcar/cancelar), tarefas (EN e PT), treino e nutrição com todos os
campos, a medição do aparelho da clínica chegando com `source: CLINIC_DEVICE` +
`context: PRE_SESSION` + `recordedById`, e **isolamento entre pacientes**: o paciente da clínica B
leu `0` em todas as rotas.
