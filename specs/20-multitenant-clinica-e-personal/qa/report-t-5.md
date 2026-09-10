# QA Report — T-5: Agenda (agendamento atrás do acesso por tenant)

**Data:** 2026-09-10
**Executado por:** agente qa-tester. A sessão principal gravou o relatório porque a escrita do agente foi bloqueada.
**Ambiente:** LOCAL — http://localhost:4191 (`DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`, middleware novo). Banco local. Prod não tocada.
**Fixtures:** tenant A "QA Clinic A" (qa.admina, qa.fisioa bookable, qa.pacientea/qa.pacientea2) e tenant B "QA Studio PT" (qa.trainer ADMIN bookable, qa.aluno).
**Driver:** script Node (módulo `http`), login NextAuth + Bearer do app, checagens via Prisma, ~1 req/s.
**Resultado geral:** ✅ **APROVADO** — 11 de 11 cenários.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| TH | `GET /api/therapists` escopado ao tenant do ator | API | ✅ |
| AV1 | `GET /api/availability` com terapeuta de outro tenant → 404; do próprio → 200 | API | ✅ |
| AV2 | `GET /api/availability` com Bearer do app → 200 (não 307) | API | ✅ |
| AP1 | `POST /api/appointments` (aluno) com terapeuta de outro tenant → 404, nada criado | API | ✅ |
| AP2 | `POST /api/appointments` (aluno) sem terapeuta → 200, bookable de B, `clinicId`=B | API + DB | ✅ |
| AP3 | `POST /api/appointments` (staff B) com paciente A → 404; com aluno próprio → 200 `clinicId`=B | API + DB | ✅ |
| VA | `GET /api/appointments?viewAll=true` (staff B) → só tenant B | API + DB | ✅ |
| RE | reagendar agendamento do tenant A como aluno B → 404 | API + DB | ✅ |
| ADAV | `/api/admin/availability` de terapeuta de outro tenant → 404; próprio → 200 | API + DB | ✅ |
| PS | `GET /api/public/schedule` — padrão / `?clinic=<slug>` / inexistente | API | ✅ (com observação) |
| REG | Paciente da BPR agenda com o "Bruno" → 200, `clinicId` gravado (tenant A) | API + DB | ✅ |
| Sink | `Sent via Resend` no log | Log | ✅ (0) |

## Detalhes

### TH ✅
- qa.aluno (B): só qa.trainer; qa.fisioa (A) não aparece.
- qa.pacientea (A): só qa.fisioa.

### AV1 ✅
- qa.aluno com `therapistId` de qa.fisioa (A) → **404** `{"error":"No therapist available"}`.
- qa.aluno com `therapistId` de qa.trainer (B) → **200**, 12 slots, 09:00–17:00.

### AV2 ✅
- `POST /api/mobile/login` (qa.aluno) → accessToken.
- `GET /api/availability?date=2026-09-14` com Bearer → **200** (a rota entrou em `MOBILE_API_PREFIXES`; antes 307), resolvendo para o tenant próprio.

### AP1 ✅
- `POST` com `therapistId` de qa.fisioa (A) → **404**; DB: 0 agendamentos criados.

### AP2 ✅
- `POST` sem `therapistId` → **200**; DB: `clinicId`=B, `therapistId`=qa.trainer (único bookable de B), `patientId`=qa.aluno.

### AP3 ✅
- qa.trainer com `patientId` de qa.pacientea (A) → **404** `{"error":"Not found"}`; DB: nada criado.
- qa.trainer com `patientId` de qa.aluno (B) → **200**; DB: `clinicId`=B.

### VA ✅
- qa.trainer, `viewAll=true` → **200**, 3 agendamentos, **0** do tenant A. Só contagem e `clinicId` inspecionados.

### RE ✅
- qa.aluno reagendando agendamento do tenant A → **404** `{"error":"Appointment not found"}`; DB: agendamento intacto (`rescheduleCount=0`).

### ADAV ✅
- qa.trainer, `GET`/`PUT` com `therapistId` de qa.fisioa (A) → **404** `{"error":"Therapist not found"}`; DB: disponibilidade de qa.fisioa inalterada.
- qa.fisioa, `GET` próprio → **200**, 5 linhas.

### PS ✅ (com observação)
- Sem parâmetro (tenant padrão): **200** `{"schedule":[]}`.
- `?clinic=qa-studio-pt`: **200** com seg–sex 09:00–17:00.
- `?clinic=does-not-exist`: **200** `{"schedule":[]}`.

**Observação (não é falha da T-5):** localmente o tenant padrão `bruno-physical-rehabilitation` não tem profissional `bookable` ativo, então a rota devolve `[]`. O roteamento por tenant está validado: sem parâmetro e `?clinic=bruno-physical-rehabilitation` dão o mesmo resultado (o padrão aponta de fato para o tenant padrão, não para `findFirst`); `?clinic=qa-clinic-a` devolve horas reais; slug inexistente → vazio. Em prod o BPR tem o Bruno bookable, então o público verá as horas.

### REG ✅
- qa.pacientea (A), `POST` com qa.fisioa → **200**; DB: `clinicId`=A. O fluxo da BPR funciona e agora grava o tenant.

## Sink e limpeza
- `Sent via Resend`: **0**; `OUTBOUND-SINK`: 6 (guarda da T-1). Nenhum 500 nas linhas novas.
- `tenant-cleanup.cjs` → **leftover fixtures: 0**.

## Falhas e recomendações
- Nenhuma falha de código; todos os cenários de isolamento e a regressão da BPR passaram.
- Ressalva de seed local (PS do tenant padrão vazio) — acima; não afeta prod.
- Escopo já registrado: a T-5 depende da T-13 ou do item 3 da T-14 antes de prod, porque paciente sem `clinicId` recebe 409 ao agendar.

**Veredito: APROVADO.**

## Code review
6 achados. Corrigido:
- **#3 (bug real, código da T-1):** `sinkMessageId()` usava o `crypto.randomUUID()` global sem importar `crypto`. Num Node sem o crypto global, o caminho de e-mail engolido lançaria erro em vez de devolver o id falso, virando 500. Adicionado `import { randomUUID } from "crypto"`. Corrigido em commit próprio.

Não corrigidos (intencional/follow-up):
- **#1 e #2:** paciente sem clínica recebe 409 ao agendar e 400 na disponibilidade. É o fail-closed já registrado ("T-5 não sobe sem T-13 ou item 3 da T-14"). Em prod os pacientes têm clínica.
- **#4 e #5:** SUPERADMIN opera dentro da clínica selecionada (D4); gestão de usuários e listagem entre clínicas passam por selecionar a clínica. Em prod hoje, com uma clínica, nada muda.
- **#6 (performance):** `soapNoteAccess` carrega a nota e o handler consulta de novo. Follow-up de otimização; sem risco de correção agora.

Verificação final: 157/157 testes; `tsc` sem erro nos arquivos tocados.

**Veredito: APROVADO** (QA + review).
