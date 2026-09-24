# T-14: Dispositivo da clínica — sessão de medição e atribuição da leitura

**Status:** ✅ concluída
**Depende de:** T-9 (webhook da Withings). Sem ela funciona pelo sync agendado, com atraso de minutos.
**Fonte:** `spec-medicao-pressao-clinica.md` (Bruno, 23/09/2026) — a spec detalhada desta tarefa e da
T-15. O que está aqui é ela traduzida para os nomes reais deste projeto, mais o que decidi onde ela
deixou escolha ("ajustar ao schema existente", "sugestão").

## Objetivo

Um BPM Connect **da clínica** que mede qualquer pessoa que chegue, e cada leitura vai para o
prontuário certo — sem digitação e sem o paciente precisar de conta Withings.

## Contexto

Hoje a integração é 1 conta = 1 paciente: a conexão pertence a quem autorizou, e toda medida que
chega é dele. Um aparelho na recepção quebra essa premissa — é uma conta só, medindo dez pacientes
por dia. A Withings só conhece a conta da clínica; **quem decide de quem é a medida é o BPR**, por
uma janela de tempo que o terapeuta abre na ficha do paciente.

### Tradução para este projeto

| Na spec do Bruno | Nome real aqui |
|---|---|
| `is_clinic_device` na conexão | campo novo em `WearableConnection` |
| `clinic_measurement_sessions` | modelo `ClinicMeasurementSession` |
| tabela de métricas | `BloodPressureReading` (pressão) e `WearableDataPoint` (resto) |
| `unassigned_measurements` | modelo `UnassignedMeasurement` |
| log de auditoria | `logAudit` / `AuditLog` (`lib/system-logger.ts`), já existe |
| `/api/clinic/*` | `/api/admin/*`, que é a convenção deste código para rota de staff |

### Três pontos onde o schema atual não aceita a spec como está

1. **`patient_id` nulo na conexão não existe.** `WearableConnection.userId` é obrigatório e há
   `@@unique([userId, provider])`. A conexão da clínica fica no **usuário de staff que autorizou**,
   marcada com `isClinicDevice: true` e com `clinicId` preenchido — não num paciente fictício, que
   viraria um "paciente" fantasma no tenant.
2. **"Uma conta Withings só pode estar ligada a um único paciente"** ainda não é garantido:
   `providerUserId` não tem índice único. Vira `@@unique([provider, providerUserId])`, e tentar
   conectar uma conta já vinculada devolve mensagem clara em vez de 500 do banco.
3. **Deduplicação por `withings_measure_id`**: a Withings devolve `grpid` por grupo de medida. É
   melhor chave do que a tupla (conexão, horário, valores) que eu tinha escrito, e é a que vale.

## Decisões desta tarefa

**A janela vale sobre o horário da medida, não o da chegada.** O aparelho sincroniza por Wi-Fi
quando termina, e o webhook chega depois. Comparar com `now()` atribuiria errado ou descartaria
leitura boa. A comparação é `openedAt − 30s ≤ measuredAt ≤ expiresAt` — os 30 segundos de folga são
da spec do Bruno e existem porque o terapeuta às vezes aperta "Medir" com o manguito já inflando.

**Uma sessão aberta por aparelho, e abrir outra é bloqueado.** Não fecha a anterior em silêncio:
devolve erro dizendo qual paciente está com a janela aberta e exige cancelar. Fechar sozinho é o
tipo de conveniência que troca prontuário.

**Ambiguidade nunca vira palpite.** Com um aparelho só e uma sessão aberta por vez, duas janelas
não se sobrepõem; com dois aparelhos, podem. Medida que casar com mais de uma sessão vai para a
caixa de entrada. Pressão no prontuário errado é erro clínico; pedir um clique não é.

**A leitura da clínica é marcada como tal.** `BloodPressureMethod` ganha `CLINIC_DEVICE`;
`recordedById` é quem abriu a sessão (mesma semântica da medição manual da ativ. 69); o contexto
(`PRE_SESSION` / `POST_SESSION` / `OTHER`) fica na leitura e na sessão.

**Nada da conta da clínica entra em prontuário sem passar pela regra ou por atribuição manual.**

## Passos

1. **Schema** (migration própria; nunca `db push` — o Postgres local é compartilhado entre
   worktrees):
   - `WearableConnection`: `isClinicDevice Boolean @default(false)`, `clinicId String?`,
     `deviceLabel String?` ("BPM Connect — recepção"), `@@unique([provider, providerUserId])`.
   - `ClinicMeasurementSession`: `id`, `clinicId`, `patientId`, `connectionId`, `context`
     (`PRE_SESSION|POST_SESSION|OTHER`), `openedById`, `openedAt`, `expiresAt`,
     `status` (`OPEN|COMPLETED|EXPIRED|CANCELLED`), `readingId String?`, `cancelledById`.
     Índices por `connectionId + status` e `expiresAt`.
   - `UnassignedMeasurement`: `id`, `clinicId`, `connectionId`, `systolic`, `diastolic`,
     `heartRate`, `measuredAt`, `receivedAt`, `raw Json`, `withingsMeasureId`,
     `assignedPatientId`, `assignedById`, `assignedAt`, `discardedById`, `discardedAt`,
     `discardReason`.
   - `BloodPressureReading`: `source` (`PATIENT_DEVICE|CLINIC_DEVICE|MANUAL`), `context`
     (`PRE_SESSION|POST_SESSION|HOME|OTHER`), `clinicSessionId String?`,
     `withingsMeasureId String?` — este último único por conexão.
   - `BloodPressureMethod`: novo valor `CLINIC_DEVICE`.
2. **Conectar o aparelho da clínica**: botão na caixa de entrada de medições
   (`/admin/measurements/inbox`), não numa tela de configurações nova — é onde o terapeuta já está
   quando descobre que falta aparelho. Faz o mesmo OAuth, com o escopo `clinic` **assinado no
   state** (quem volta do provedor não consegue se declarar aparelho da clínica por query string),
   e grava `isClinicDevice: true` + `clinicId` do staff que autorizou. Assina o webhook (T-9) igual
   às contas de paciente.
   **Limitação conhecida:** `@@unique([userId, provider])` significa que o staff que conecta o
   aparelho da clínica não pode ter, na mesma conta, uma conexão Withings pessoal. Na prática a
   clínica usa uma conta de staff dedicada; se isso incomodar, é uma mudança de chave.
3. **API de sessão** (staff, `getSessionStaffActor` + `staffPatientAccess`):
   - `POST /api/admin/measurement-sessions` `{ patientId, context }` → cria com 3 minutos de
     validade; 409 se já houver uma `OPEN` no aparelho.
   - `GET /api/admin/measurement-sessions/[id]` → status e leitura (é o que a tela consulta a cada
     3 segundos).
   - `POST /api/admin/measurement-sessions/[id]/cancel`.
   - A duração vem de `AutomationRule` quando existir, com 3 minutos como padrão — mesmo padrão da
     T-3, e com teste de plausibilidade (uma janela de 8 horas não é configuração, é erro).
4. **Atribuição** (`lib/clinic-device.ts`): dada uma medida de conexão `isClinicDevice`, procura
   sessão `OPEN` cuja janela contenha `measuredAt`. Uma só → grava a `BloodPressureReading`
   (`source: CLINIC_DEVICE`, contexto da sessão, `clinicSessionId`), marca a sessão `COMPLETED` e
   guarda `readingId`. Nenhuma ou mais de uma → `UnassignedMeasurement`.
5. **Chamar dos dois caminhos**: webhook (T-9) e sync agendado. Mesma função; o webhook só chega
   antes.
6. **Expiração**: sessão vencida é marcada `EXPIRED` na própria leitura de status (preguiçosa), sem
   depender de cron — um cron a mais é uma peça a mais para falhar em silêncio.
7. **Conexão de paciente segue como está**: `source: PATIENT_DEVICE`, `context: HOME`. Esta tarefa
   não pode mudar o comportamento de quem tem aparelho próprio.
8. **Auditoria** com `logAudit`: abertura, cancelamento, atribuição automática e atribuição manual.

## Arquivos afetados

- `prisma/schema.prisma` + migration
- `lib/clinic-device.ts` (novo)
- `app/api/admin/measurement-sessions/route.ts` e `[id]/{route,cancel}.ts` (novos)
- `app/api/wearables/withings/webhook/route.ts` (T-9)
- `lib/withings.ts` e a rota de sync (chamar a atribuição)
- tela de Configurações da clínica → Dispositivos

## Critérios de aceite

- [ ] Medida dentro da janela entra no prontuário do paciente da sessão, com `CLINIC_DEVICE` e o contexto
- [ ] Medida fora de qualquer janela vai para `UnassignedMeasurement`, nunca para um paciente
- [ ] Medida dentro de duas janelas vai para `UnassignedMeasurement`
- [ ] Abrir uma segunda sessão no mesmo aparelho é recusado, dizendo qual está aberta
- [ ] A mesma medida (mesmo `grpid`) chegando duas vezes grava uma vez
- [ ] Sessão vencida aparece como `EXPIRED` sem cron
- [ ] Sessão de uma clínica não captura medida de aparelho de outra clínica
- [ ] Conta Withings já ligada a um paciente não pode ser ligada a outro — a mensagem diz isso
- [ ] Paciente com aparelho próprio continua igual a hoje (`PATIENT_DEVICE` / `HOME`)
- [ ] Abertura, cancelamento e atribuição constam no `AuditLog` com quem, quando e qual leitura

## Suposições

1. **Três minutos** é a janela, com 30 segundos de folga antes — os dois números vêm da spec do
   Bruno e ficam configuráveis.
2. **Só pressão arterial.** Balança e outros aparelhos usam o mesmo mecanismo depois; o produto que
   existe é o BPM Connect.
3. **Um perfil Withings** na conta da clínica. Vários perfis não quebram a atribuição por janela,
   mas não foi testado.
4. **Consentimento**: medir com o aparelho da clínica e gravar no prontuário é ato clínico, igual a
   medir com esfigmomanômetro. Não estou criando consentimento novo aqui; se o DPIA do plano
   comercial exigir, vira tarefa à parte.
5. **Backup do Postgres para fora do VPS e teste de restauração** (seção 8 da spec do Bruno) é
   infraestrutura, não código desta tarefa. Fica anotado como pendência do piloto, não como passo
   aqui.
