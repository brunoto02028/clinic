# QA Report ONLINE — Atividade 071: Alerta de adesão para o staff + observação do paciente

**Ambiente:** produção, https://bpr.clinic
**Deploy verificado:** commit `b7d1034e`, deploy finished/healthy no Coolify
**Data:** 23/09/2026
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Card "Patients falling behind" mostra paciente fixture (BPR) com dias sem atividade | API + UI | ✅ |
| 2a | Paciente escreve observação em `/dashboard/treatment`, salva, persiste após reload | UI | ✅ |
| 2b | Staff da BPR vê a observação em `/admin/patients/{id}` e via `GET .../protocol-notes` | UI + API | ✅ |
| 3 | Protocolo arquivado (`status: ARCHIVED`) — observação continua visível com badge "Archived plan" | UI + API | ✅ |
| 4 | Isolamento de tenant — staff de outra clínica não vê o paciente no card nem a nota (404) | API + UI | ✅ |
| 5 | Bug do payment-gating — log num protocolo não pago não conta como atividade recente | API | ✅ (evidência indireta, ver detalhe) |
| 6 | Regressão — "Today's adherence" e fluxo de marcar exercício como feito | UI + API | ✅ |

Todos os 7 cenários passaram. Nenhuma falha encontrada nesta rodada.

## Ambiente e método

- Produção real (`https://bpr.clinic`), banco de produção (host `86.48.18.88:5490`, confirmado no início do script de fixtures via guarda `PROD_HOST`).
- Credenciais de produção (`DATABASE_URL`, `NEXTAUTH_SECRET`) obtidas via API do Coolify (`GET /api/v1/applications/o9plir7dhgskyng8athrp1ec/envs`, entradas com `is_preview: false`), gravadas só num arquivo temporário no scratchpad da sessão — nunca impressas no transcript nem commitadas.
- Sessões reais via `next-auth/jwt encode()` + cookie `__Secure-next-auth.session-token` (nome do cookie em produção, HTTPS — diferente do `next-auth.session-token` usado em local/HTTP), mesma técnica já usada em `scripts/qa/bp069-online-playwright.cjs`.
- **Staff da BPR usado no teste: a conta real `admin@bpr.clinic`** (SUPERADMIN, clínica BPR) — únicos usuários staff reais da BPR em produção são `admin@bpr.clinic` e `kaiopassos1997@gmail.com`, ambos `SUPERADMIN`, nenhum `THERAPIST`/`ADMIN` puro. Confirmei no código (`lib/session-clinic.ts`) que `sessionClinicId` resolve um `SUPERADMIN` pela sua própria `clinicId` a menos que exista cookie `selected-clinic-id` — não usado aqui — então o escopo por clínica se aplica normalmente.
- Produção só tem **uma clínica real do tipo `CLINIC`** (BPR). Para o teste de isolamento de tenant, criei uma segunda clínica `CLINIC` descartável (`qa071online-clinicb-*`) com um admin fixture — mesmo padrão já usado no QA local desta atividade.
- Paciente fixture criado **dentro da clínica real da BPR** (`cmska2rj90000sb4gqbfqzb0o`), rotulado `qa071-online-patient-*@example.invalid`, com `fullAccessOverride: true` + `consentAcceptedAt` preenchido (necessário para `/dashboard/treatment` carregar sem passar por um `TreatmentPackage` pago — achado já registrado no QA local desta atividade).
- UI testada com Playwright-as-a-library (headless Chromium), não o MCP, para rodar de forma determinística e scriptável contra o domínio real — mesmo padrão de `scripts/qa/bp069-online-playwright.cjs`.
- Scripts novos (mantidos no repo, convenção `scripts/qa/*.cjs`): `qa071-online-fixtures.cjs`, `qa071-online-mint-session.cjs`, `qa071-online-playwright.cjs`, `qa071-online-playwright-part2.cjs`, `qa071-online-cleanup.cjs`.

## Detalhes

### 1. Card "Patients falling behind" — paciente fixture aparece para o staff da BPR ✅

Fixture: paciente na clínica BPR, Protocolo A `SENT_TO_PATIENT`, item `HOME_EXERCISE` liberado desde `startWeek: 1` (sem fim), protocolo iniciado há 60 dias, **nenhum** `ExerciseCompletionLog`.

**API** (`GET /api/admin/adherence/falling-behind`, sessão `admin@bpr.clinic`):
```
HTTP/1.1 200 OK
{"patients":[
  {"patientId":"cmu09ydj5...","name":"Ana Livia Pessin Prata","daysWithoutActivity":6,"hasNote":false},
  {"patientId":"cmudusd9f0001xzx054sw7wpc","name":"QA071Online Patient (delete me)","daysWithoutActivity":61,"hasNote":false}
]}
```
O paciente fixture aparece com `daysWithoutActivity: 61`, coerente com "sem log nenhum desde o início do protocolo há 60 dias". **Achado incidental (não é bug, é evidência de que a feature funciona também sobre dado real):** a lista também trouxe uma paciente real da clínica, "Ana Livia Pessin Prata", com 6 dias sem log — não toquei nesse registro, é dado real de produção, só confirma que o card está de fato surfaceando pacientes reais atrasados, não só a fixture.

**UI:** dashboard admin, card "Patients falling behind" mostra ambos os nomes com o texto "N days with no log", link do paciente fixture aponta corretamente para `/admin/patients/cmudusd9f0001xzx054sw7wpc`. Nenhum `POST` para rota de notificação/e-mail disparado ao carregar a página. Zero erros de console.

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/online-01-card-falling-behind-bpr.png`

### 2. Observação do paciente end-to-end ✅

**2a — paciente escreve e salva:** como o paciente fixture (sessão real via JWT), abri `/dashboard/treatment`, preenchi o campo de observação do item "QA071online item A (delete me)" com o texto `"QA071online nota de teste — dor leve ao subir escadas (fixture, apagar)"`, saí do campo (blur → salva), recarreguei a página inteira. O textarea mostrou o texto salvo depois do reload.

Screenshots: `online-02-treatment-before-note.png`, `online-03-note-saved-indicator.png`, `online-04-note-persisted-after-reload.png`

**2b — staff vê a observação:** como `admin@bpr.clinic`, abri `/admin/patients/cmudusd9f0001xzx054sw7wpc`. Seção "PATIENT NOTES" mostra o título certo do item e o texto exato escrito pelo paciente.

Screenshot: `online-05-staff-sees-note-before-archive.png`

Confirmado também via API (`GET /api/admin/patients/{id}/protocol-notes`, ver seção 3 abaixo — mesma chamada usada depois do arquivamento).

### 3. Nota de protocolo arquivado continua visível, com badge "Archived plan" ✅

Arquivei o Protocolo A diretamente no banco de produção (`UPDATE TreatmentProtocol SET status = 'ARCHIVED'`), simulando o que acontece automaticamente quando um novo template é atribuído ao mesmo paciente — o mesmo gatilho descrito no `plan.md` (achado do code review, `app/api/admin/protocols/[id]/assign/route.ts:100-104`).

**API** (`GET /api/admin/patients/{id}/protocol-notes`, sessão `admin@bpr.clinic`, depois do arquivamento):
```
HTTP/1.1 200 OK
{"notes":[{
  "id":"cmudusdf80004xzx0c3qfi8kz",
  "title":"QA071online item A (delete me)",
  "patientNotes":"QA071online nota de teste — dor leve ao subir escadas (fixture, apagar)",
  "protocolTitle":"QA071online protocol A (delete me)",
  "protocolStatus":"ARCHIVED"
}]}
```

**UI:** recarreguei `/admin/patients/{id}` — a nota continua na seção "PATIENT NOTES", agora com o badge **"ARCHIVED PLAN — QA071ONLINE PROTOCOL A (DELETE ME)"** ao lado do título do item, exatamente o comportamento decidido pelo Bruno ("sempre deixar arquivado visível para a clínica ok?").

Screenshot: `online-08-staff-sees-note-after-archive-badge.png`

### 4. Isolamento de tenant ✅

Staff fixture de uma segunda clínica (`qa071online-clinicb-*`, role `ADMIN`) tentou acessar o paciente/nota da BPR:

**API** (`GET /api/admin/patients/{id}/protocol-notes`, sessão do admin da Clínica B):
```
HTTP/1.1 404 Not Found
{"error":"Patient not found"}
```

**API** (`GET /api/admin/adherence/falling-behind`, sessão do admin da Clínica B) — não traz o paciente da BPR (nem nenhum outro, a clínica fixture não tem paciente algum):
```
HTTP/1.1 200 OK
{"patients":[]}
```

**UI:** navegar direto para `/admin/patients/cmudusd9f0001xzx054sw7wpc` como staff da Clínica B mostra "Patient not found." — nenhum dado do paciente ou da nota vaza.

Screenshot: `online-09-tenant-isolation-clinicb-blocked.png`

### 5. Bug do payment-gating corrigido ✅ (evidência indireta)

Não simulei este cenário como um passo isolado — a fixture já foi montada para produzir a evidência diretamente na primeira chamada do cenário 1: além do Protocolo A (sem pacote, sem gating), criei um **Protocolo B** com `TreatmentPackage.isPaid: false` e um `ExerciseCompletionLog` datado de **hoje** no item liberado desse protocolo B.

Se o bug do payment-gating não estivesse corrigido, esse log de hoje (contra um protocolo não pago) teria resetado a data do "último log" do paciente globalmente, e ele **não apareceria** na lista de atrasados (streak zerado). O que a chamada do cenário 1 mostrou:

```
{"patientId":"cmudusd9f0001xzx054sw7wpc","name":"QA071Online Patient (delete me)","daysWithoutActivity":61,"hasNote":false}
```

`daysWithoutActivity: 61` — exatamente o valor esperado só a partir do Protocolo A (sem log nenhum), **apesar de existir um log de hoje no Protocolo B**. Confirma que `getDaysWithoutActivity` (`lib/patient-adherence-streak.ts:74-80`) está de fato excluindo o protocolo não pago do cálculo, como a correção do code review descreve. Não precisei de um passo extra separado — a mesma fixture cobre os cenários 1 e 5 ao mesmo tempo.

### 6. Regressão — "Today's adherence" e marcar exercício como feito ✅

**"Today's adherence" continua funcionando:** mesma chamada/tela do cenário 1 — o card "Today's adherence" apareceu normalmente ao lado do card novo, com dado real (paciente "Ana Livia Pessin Prata" com itens pendentes listados). Também testado isoladamente via API:
```
GET /api/admin/adherence/today (sessão admin@bpr.clinic)
HTTP/1.1 200 OK
{"completed":[],"missing":[{"patientId":"...","name":"Ana Livia Pessin Prata","missingItems":[...]}]}
```

**Marcar exercício como feito:** como o paciente fixture, em `/dashboard/treatment`, cliquei no botão "Mark as done today" do item do Protocolo A. Sem erro/crash. Confirmei por `SELECT` direto no banco que um `ExerciseCompletionLog` real foi criado (`completedDate: 2026-09-23T00:00:00.000Z`), gravado pela própria UI — não só por aparência visual.

Screenshots: `online-06-treatment-before-mark-done.png`, `online-07-treatment-after-mark-done.png`

## Erros de console

Nenhum erro de console JS em nenhum dos fluxos testados (dashboard admin, `/dashboard/treatment` do paciente, perfil do paciente antes/depois do arquivamento, tentativa de acesso cross-tenant).

## Falhas e recomendações

Nenhuma falha encontrada. Um ponto de atenção, não bloqueante:

- **Não há staff `ADMIN`/`THERAPIST` "puro" na BPR em produção** — os dois únicos usuários staff reais são `SUPERADMIN`. Isso não afeta o resultado deste QA (confirmei no código que `SUPERADMIN` é escopado pela própria clínica do jeito certo), mas significa que esta rodada não pôde reproduzir o caso "staff comum (não SUPERADMIN) da BPR" com uma conta real — só com a fixture da Clínica B (role `ADMIN`). Não é um problema desta atividade; registro só para quem for planejar QA futuro que dependa especificamente do papel `ADMIN`/`THERAPIST` em produção.

## Limpeza

Todas as fixtures (`qa071-online-*` / `qa071online-clinicb-*`: 1 paciente na clínica BPR real, 2 protocolos, 2 itens, 1 pacote de tratamento, 2 logs de conclusão, 1 clínica descartável, 1 usuário admin da clínica descartável) foram removidas via `scripts/qa/qa071-online-cleanup.cjs`. Confirmado por `SELECT` direto (via Prisma) que não resta nenhuma linha `qa071-online-*`/`qa071online-*` em `User`, `Clinic`, `TreatmentProtocol`, `TreatmentPackage` ou `ProtocolItem`, e que `ExerciseCompletionLog` do paciente fixture está zerado:
```
POST-CLEANUP CHECK: {"remainingUsers":0,"remainingClinics":0,"remainingProtocols":0,"remainingPackages":0,"remainingItems":0}
Cleanup confirmed clean.
```
Verificação final extra: consulta de todas as clínicas em produção voltou exatamente às 3 originais (Bruno / BPR Physical Rehabilitation / Manu Training) — nenhuma clínica fixture sobrou. Nenhum dado de paciente real foi tocado, lido além do necessário para identificar contas de staff, ou modificado em nenhum momento deste QA.

---

**Resultado geral: ✅ aprovado — 7/7 cenários passaram em produção.**
