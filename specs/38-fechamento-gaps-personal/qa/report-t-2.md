# QA Report — T-2: `Appointment.clinicId` obrigatório

**Data:** 13/09/2026
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 6 | Backfill resolve os nulos existentes | Script | ✅ |
| 7 | Backfill idempotente (2ª rodada não muda nada) | Script | ✅ |
| 8 | `db push` com campo obrigatório, sem erro | Schema | ✅ |
| 9a | `POST /api/appointments` grava `clinicId` | API | ✅ |
| 9b | `POST /api/admin/appointments` grava `clinicId` | API | ✅ |
| 9c | `POST /api/webhooks/vapi` (bookAppointment) grava `clinicId` | API | ✅ |
| — | Sanidade extra: nenhum erro TS novo fora das exceções combinadas | Build | ✅ |

## Detalhes

### 6. Backfill resolve os nulos existentes ✅
Confirmado por leitura de código + estado do banco (o backfill já havia sido rodado antes desta sessão de QA, resolvendo os 3 registros).

- **Comando:** `node -e "... SELECT COUNT(*) FROM \"Appointment\" WHERE \"clinicId\" IS NULL ..."`
- **Resultado:**
  ```
  null clinicId count: 0
  total appointments: 9
  ```

### 7. Idempotência ✅
- **Comando:** `node scripts/backfill-appointment-clinicid.js`
- **Output:**
  ```
  [backfill-appointment-clinicid] No orphaned appointments — nothing to do.
  ```
- Confirmado: segunda (e, nesta sessão, terceira/quarta) execução não altera nada, como esperado.

### 8. `db push` com schema obrigatório, sem erro ✅
- **Comando:** `npx prisma@6.7.0 db push --skip-generate --accept-data-loss`
- **Output:**
  ```
  The database is already in sync with the Prisma schema.
  ```
- Rodado duas vezes durante o QA (antes e depois de toda a verificação de TypeScript, que exigiu manipulação temporária de schema/client) — ambas as vezes "already in sync", sem erro.
- Confirmado por leitura do schema: `prisma/schema.prisma:1002-1005` — `clinicId String` (obrigatório) e `clinic Clinic @relation(...)` (não-opcional). Client Prisma regenerado confirma: `AppointmentUncheckedCreateInput.clinicId: string` (não `string | null`).

### 9. Criar agendamento pelos 3 caminhos grava `clinicId` ✅

**a) `POST /api/appointments`** (staff `qa.trainer@example.test` reservando para o aluno `qa.aluno@example.test`, mesmo tenant)
- **Comando:**
  ```
  curl -b cookies_trainer.txt -X POST http://localhost:4000/api/appointments \
    -H "Content-Type: application/json" \
    -d '{"dateTime":"2026-10-01T10:00:00.000Z","treatmentType":"QA Test Session","patientId":"cmtyd59z8000fxzkws4td7bxu"}'
  ```
- **Resultado:** HTTP 200, `clinicId":"cmtyd59yk0001xzkw60m15hi5"` presente no registro criado (id `cmtzkp1tj0003xzhsy9ed45sd`).

**b) `POST /api/admin/appointments`** (mesmo staff)
- **Comando:**
  ```
  curl -b cookies_trainer.txt -X POST http://localhost:4000/api/admin/appointments \
    -H "Content-Type: application/json" \
    -d '{"patientId":"cmtyd59z8000fxzkws4td7bxu","dateTime":"2026-10-02T10:00:00.000Z","treatmentType":"QA Admin Test Session"}'
  ```
- **Resultado:** HTTP 200, `clinicId":"cmtyd59yk0001xzkw60m15hi5"` presente no registro criado (id `cmtzkp2pi0005xzhsxmpl2umf`).

**c) `POST /api/webhooks/vapi`** (tool-call `bookAppointment`) — **testado com chamada real**, não só leitura de código
- Habilitei temporariamente `VAPI_WEBHOOK_SECRET` no `.env` local (arquivo gitignorado, revertido ao final) e reiniciei o dev server para poder autenticar a chamada.
- **Comando:**
  ```
  curl -X POST http://localhost:4000/api/webhooks/vapi \
    -H "Content-Type: application/json" \
    -H "x-vapi-secret: qa38-t2-temp-secret" \
    -d '{"message":{"type":"tool-calls","call":{"id":"qa38-t2-test-call-001"},
         "toolCallList":[{"id":"tool-call-1","function":{"name":"bookAppointment",
         "arguments":"{\"patientName\":\"QA Vapi Teste\",\"patientPhone\":\"+441234567890\",\"patientEmail\":\"qa.vapi.teste@example.test\",\"dateTime\":\"2026-10-13T08:50:37.485Z\",\"treatmentType\":\"Follow-up Treatment\",\"chiefComplaint\":\"QA test via curl\"}"}}]}}'
  ```
- **Output:** HTTP 200, `{"results":[{"toolCallId":"tool-call-1","result":"Perfect! I've booked a Follow-up Treatment for QA Vapi Teste ..."}]}`
- **Verificação no banco:**
  ```json
  {
    "id": "cmtzkqege0003xz1sv0bjo99c",
    "clinicId": "cmtxenp8e0000xzdkmf2ju7yx",
    "patient": { "email": "qa.vapi.teste@example.test", "clinicId": "cmtxenp8e0000xzdkmf2ju7yx" }
  }
  ```
  `clinicId` preenchido (herdado do paciente-convidado recém-criado, cujo `clinicId` veio da clínica ativa encontrada em `handleBookAppointment`).
- Também confirmado por leitura de código (`app/api/webhooks/vapi/route.ts:166-184`): `appointmentClinicId` é resolvido nas linhas 166-169 com early-return de recusa ("I'm sorry, I was unable to complete the booking...") se não resolver, e usado na linha 184 dentro do `create` — não há caminho de execução que chegue ao `create` sem essa variável já resolvida.
- Confirmado no log do servidor que nenhum e-mail real saiu: `[OUTBOUND-SINK] email → admin@bpr.clinic: ...` (guarda de outbound do ambiente dev interceptou o envio).

### Verificação extra (e): nenhum erro TypeScript novo fora do esperado ✅
Comparação rigorosa baseline vs. estado atual (T-1+T-2 aplicados):

| | Total | Dentro de `reconstruir/` | `scripts/migrate-to-multitenant.ts` (raiz) | Fora dessas duas exceções |
|---|---|---|---|---|
| Baseline (schema/client revertidos ao HEAD, antes da atividade 38) | 2069 | 169 | 0 | **1900** |
| Atual (T-1+T-2 aplicados) | 2087 | 186 | 1 | **1900** |

- Diff linha-a-linha das duas listas "fora das exceções" (`diff baseline_outside.txt current_outside.txt`) → **idêntico, exit code 0**. Nenhum erro novo fora de `reconstruir/` ou do script morto.
- O único erro novo em `scripts/migrate-to-multitenant.ts` (raiz): `error TS2322: Type 'null' is not assignable to type 'string | StringFilter<"Appointment"> | undefined'` na linha 79 — exatamente o script morto mencionado como exceção aceitável, quebrado porque usava `clinicId: null` em uma query, agora inválido com o campo obrigatório. Script não é referenciado em lugar nenhum do app (migração histórica já executada).
- Todo o resto do delta (+17) caiu dentro de `reconstruir/` (clone/backup antigo, fora do app real), consistente com o aviso do solicitante.
- **Nota metodológica:** para produzir essa comparação foi necessário parar o dev server, fazer `git stash` das mudanças de T-1/T-2, regenerar o Prisma Client a partir do schema anterior (HEAD), rodar o `tsc`, depois `git stash pop` e regenerar o client de volta ao estado T-2. Confirmado ao final que `git status`, `prisma/schema.prisma` e `db push` voltaram exatamente ao estado esperado.

## Erros de console
Não aplicável — T-2 é 100% backend/API, sem UI. Nenhum teste de browser/Playwright foi necessário para esta tarefa.

## Falhas e recomendações
Nenhuma falha encontrada. Todos os critérios de aceite da tarefa foram confirmados com evidência real:
- Backfill resolve os órfãos e é idempotente.
- Schema obrigatório, `db push` limpo.
- Os 3 pontos de criação de `Appointment` (paciente/staff via `/api/appointments`, admin via `/api/admin/appointments`, voice AI via `/api/webhooks/vapi`) gravam `clinicId` corretamente, testados com chamadas reais (não apenas leitura de código).
- Nenhum erro de TypeScript novo introduzido fora das duas exceções pré-aprovadas (`reconstruir/` e o script morto `scripts/migrate-to-multitenant.ts`).

**Limpeza realizada ao final:** os 3 agendamentos de teste (`cmtzkp1tj0003xzhsy9ed45sd`, `cmtzkp2pi0005xzhsxmpl2umf`, `cmtzkqege0003xz1sv0bjo99c`) e o usuário-paciente convidado criado pelo webhook (`qa.vapi.teste@example.test`) foram deletados do banco local. Contagem final: 9 agendamentos, 0 com `clinicId` nulo (igual ao estado pré-QA). A variável temporária `VAPI_WEBHOOK_SECRET` foi removida do `.env` (arquivo gitignorado, sem impacto em versionamento) e o dev server foi reiniciado, voltando ao ar em `http://localhost:4000` (HTTP 200) com o Prisma Client correto (schema T-2, `clinicId` obrigatório).

---

## Segunda rodada de code review — correções

Uma segunda passada de code review achou 2 problemas reais no fix do `app/api/webhooks/vapi/route.ts` (o webhook do AI Receptionist por voz), ambos corrigidos:

1. **Criação de paciente-convidado ainda usava clínica arbitrária.** A criação do `guestEmail`/paciente novo (quando a chamada de voz é de alguém desconhecido) usava `prisma.clinic.findFirst({ where: { isActive: true } })` — qualquer clínica ativa, a primeira que o Postgres devolvesse — em vez de `getDefaultClinicId()` (já importado no arquivo pelo fix da T-2). Corrigido pra usar `getDefaultClinicId()` também nesse ponto, consistente com o resto da cascata.
2. **Terapeuta buscado sem escopo de tenant.** `prisma.user.findFirst({ where: { role: { in: [...] } } })` buscava QUALQUER admin/terapeuta do sistema, podendo devolver alguém de um tenant diferente do `appointmentClinicId` resolvido pro paciente — criaria um `Appointment` com `clinicId` de uma clínica e `therapistId` de outra (mesma classe do incidente de vazamento cross-tenant de 11/09/2026). Corrigido: a resolução de `appointmentClinicId` foi movida pra ANTES da busca do terapeuta, e a busca agora filtra `clinicId: appointmentClinicId`.

**Verificação (smoke test manual, servidor local reiniciado com `VAPI_WEBHOOK_SECRET` temporário):**
- Chamada de voz de um número/e-mail **desconhecido**, com 5 clínicas ativas no banco local e sem `DEFAULT_CLINIC_SLUG` (mesmo estado de ambiguidade já confirmado em produção) → `getDefaultClinicId()` retorna `null` → paciente-convidado criado com `clinicId: null` (correto — antes do fix teria herdado uma clínica arbitrária errada) → reserva corretamente **recusada** ("I'm sorry, I was unable to complete the booking...", HTTP 200 com mensagem de recusa) em vez de silenciosamente associar a um tenant errado.
- Chamada de voz de uma paciente **já existente** com `clinicId` resolvível (`maria.final.email@example.com`, tenant "Bruno Physical Rehabilitation") → reserva concluída com sucesso, e confirmado no banco que o `Appointment` criado tem `clinicId` E `therapist.clinicId` iguais (`cmqdug2j40000xzz04bma5dk8` nos dois) — o mismatch cross-tenant que o review apontou não ocorre mais.
- Dados de teste (paciente-convidado e os 2 agendamentos criados nesses testes) removidos ao final; `.env` restaurado ao estado original; servidor reiniciado.

**Descoberta relevante, não é bug desta tarefa — já era um problema conhecido, agora só mais visível:** com o fix acima, o AI Receptionist por voz não consegue mais completar uma reserva pra um chamador desconhecido (guest) enquanto o ambiente tiver mais de uma clínica ativa e `DEFAULT_CLINIC_SLUG` não estiver configurado — exatamente a mesma causa-raiz do bug já relatado do `/signup` retornando 503 em produção. Antes deste fix, o webhook escondia esse problema associando a reserva a uma clínica arbitrária (errado, mas "funcionava"); agora ele recusa corretamente em vez de arriscar o dado errado. Pacientes já cadastrados (com `clinicId` próprio) continuam reservando normalmente sem qualquer efeito. Definir `DEFAULT_CLINIC_SLUG` resolve os dois problemas de uma vez — segue como um item em aberto, não decidido nesta atividade.

Ainda **não corrigidos, avaliados e descartados por ora** (achados menores da mesma rodada de review):
- Reimplementação de `getDefaultClinicId()` dentro do script de backfill (em vez de importar `lib/default-tenant.ts`) — inevitável dado que scripts de boot deste projeto rodam com `node` puro, sem resolução de alias `@/` nem transpilação TS; é o mesmo padrão já usado por todo script de manutenção existente (`backfill-instagram-import-flag.js`, etc.), não uma regressão introduzida aqui.
- `scripts/backfill-appointment-clinicid.js`: mesmo após o fallback adicional pra "clínica ativa mais antiga" (ver correção abaixo), um cenário com ZERO clínicas ativas continuaria deixando linhas órfãs — extremo o suficiente (o app não funciona de forma nenhuma nesse estado) pra não justificar tratamento especial.
- **Corrigido** (não descartado): o backfill ganhou um terceiro nível de fallback — clínica ativa mais antiga (`orderBy: createdAt asc`) — só pra esta migração histórica, nunca pro webhook de reserva ao vivo (que deve recusar, não adivinhar). Reduz bastante a chance de uma linha ficar órfã pra sempre e o `db push` falhar silenciosamente em produção (estado atual: 2+ clínicas ativas, sem `DEFAULT_CLINIC_SLUG`). Testado localmente (idempotência confirmada de novo após a mudança).
