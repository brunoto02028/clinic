# QA Report — T-2: QA runtime com segundo tenant

**Data:** 2026-09-10
**Executado por:** agente qa-tester. O relatório foi gravado pela sessão principal porque a escrita do agente foi bloqueada.
**Ambiente:** `http://localhost:4170` (Next dev), banco `bpr_clinic_local` em `localhost:5432`. O host foi conferido antes de cada consulta. Nenhuma chamada a prod.
**Resultado geral:** **REPROVADO**.
- 9 dos 11 cenários de isolamento vazaram entre tenants.
- 2 passaram.
- Metade do ISO-8 não foi testada.
- Um cenário derivado (ISO-X1) também reprovou.

Convenção: um cenário de isolamento **REPROVA** quando o sistema permite o acesso a outro tenant. A coluna "Esperado" descreve o comportamento correto.

Como as chamadas foram feitas:
- **Sessão web:** login pelo formulário (Playwright) em `/staff-login` (trainer B) ou `/login` (aluno B), depois `fetch(url, {credentials:'include'})` dentro da página. O aluno B usou um contexto de navegador separado.
- **Mobile:** `POST /api/mobile/login` e depois `Authorization: Bearer <token>`, via `curl`.
- **Banco:** consultas somente leitura com `@prisma/client`, para registrar o `clinicId` gravado e confirmar remoções.

Sessões conferidas via `GET /api/auth/session`:
- trainer B: `{"role":"ADMIN","clinicId":"cmtv6bgw60000xzioksabtmuf","clinicName":"QA Studio PT"}`
- aluno B: `{"role":"PATIENT","clinicId":"cmtv6bgw60000xzioksabtmuf","clinicName":"QA Studio PT"}`

## Resumo

| # | Cenário | Tipo | Resultado | HTTP | Evidência |
|---|---|---|---|---|---|
| ISO-1 | Trainer B → `GET /api/admin/patients/{pacienteA}` | API | **REPROVOU** | 200 | Ficha completa do paciente A, inclusive a avaliação `BA-QA-00001` do tenant A |
| ISO-2 | Trainer B → `GET /api/admin/patients` | API | PASSOU | 200 | 1 paciente (qa.aluno, tenant B) |
| ISO-3 | Aluno B → `GET /api/therapists` | API | **REPROVOU** | 200 | Lista `qa.trainer` (B) **e `qa.fisioa` (A)** |
| ISO-4 | Aluno B → `GET /api/availability?date=2026-09-14&therapistId={fisioA}` | API | **REPROVOU** | 200 | 15 horários livres do fisio A |
| ISO-5 | Aluno B → `POST /api/appointments` com `therapistId={fisioA}` | API | **REPROVOU** | 200 | Agendamento criado com o fisio A; `clinicId` gravado = `null` |
| ISO-6 | Aluno B → `POST /api/appointments` sem `therapistId` | API | **REPROVOU** | 200 | Atribuído a um ADMIN **real** do tenant A, não reservável; `clinicId` = `null` |
| ISO-7 | Aluno B (PATIENT) → `GET /api/admin/body-assessments/{bodyAssessmentA}` | API | **REPROVOU** | 200 | Paciente de outro tenant lê a avaliação corporal do paciente A (89 campos + contato) |
| ISO-8a | Trainer B → `GET /api/soap-notes/{id}` | API | NÃO TESTADO | — | Não existe nota SOAP de fixture no tenant A |
| ISO-8b | Trainer B → `GET /api/patients/{pacienteA}` | API | **REPROVOU** | 200 | Dados, triagem, agendamentos e notas SOAP do paciente A |
| ISO-9 | Trainer B → `DELETE /api/patients/{pacienteA}` | API | **REPROVOU** | 200 | `{"success":true}`; usuário e avaliação apagados (cascade) |
| ISO-10 | `POST /api/mobile/register` (qa.novo) | API | **REPROVOU** | 201 | Aluno criado com `clinicId = null` (sem tenant) |
| ISO-11 | Trainer B → `GET /api/admin/exercises` | API | PASSOU | 200 | Só o exercício do tenant B |
| ISO-X1 | Trainer B → `GET /api/appointments?viewAll=true` | API | **REPROVOU** | 200 | 5 agendamentos, dos quais 3 são de pacientes reais fora do tenant B |
| PT-1 | Login do trainer B | UI | PASSOU | — | Cai em `/admin`; o card mostra "QA Studio PT"; logo, título e rodapé são da BPR |
| PT-2 | `/admin/patients` → aluno B | UI | PASSOU (ressalva) | — | Prescrição 3×10 editável; não há botão claro de nova prescrição |
| PT-3 | `/admin/exercises` | UI | PASSOU | — | "1 exercise" — só o do tenant B |
| PT-4 | `/admin/appointments` e disponibilidade | UI | PASSOU (ressalva) | — | Só o aluno B no diálogo; o catálogo de tratamentos (fisioterapia, em libras) não é do tenant |
| PT-5 | Vocabulário | UI | Registrado | — | Patient, Therapist, Clinical, SOAP Notes, Screening, Treatment |
| AL-1 | Login do aluno B → `/dashboard` | UI | PASSOU (ressalva) | — | Termos da BPR obrigatórios; "Welcome to BPR!"; o tenant B não aparece |
| AL-2 | `/dashboard/exercises` | UI | **REPROVOU** | — | Paywall "Upgrade your plan…"; o treino prescrito não aparece no web |
| AL-3 | `/dashboard/appointments/book` | UI | **REPROVOU** | — | "Choose a Therapist" oferece `qa.fisioa` (tenant A) |
| AL-4 | App: login, módulos, exercícios, agendamentos | API | PASSOU (ressalva) | 200 | Token com o tenant B; prescrição com campos de vídeo; `/api/availability` com Bearer volta 307 |

## Detalhes — isolamento entre tenants

### ISO-1 — REPROVOU
- **Request (trainer B):** `fetch('/api/admin/patients/cmtv6bgws0006xziogparfo52')`
- **Obtido:** 200. Chaves de primeiro nível: `patient, screening, footScans, bodyAssessments, soapNotes, documents, diagnoses, protocols, bpReadings, unreadMessages`.
- **Trecho:** `"bodyAssessments":[{"assessmentNumber":"BA-QA-00001","clinicId":"cmqdug2j40000xzz04bma5dk8",...}]`

### ISO-2 — PASSOU
- **Request (trainer B):** `fetch('/api/admin/patients')`
- **Obtido:** 200, com um único item: `qa.aluno@example.test`. O filtro por `clinicId` funciona nesta rota.

### ISO-3 — REPROVOU
- **Request (aluno B):** `fetch('/api/therapists')`
- **Obtido:** 200, com `qa.trainer` (B) e `qa.fisioa` (A).
- Em prod, o aluno de um personal veria todos os profissionais reserváveis da plataforma.

### ISO-4 — REPROVOU
- **Request (aluno B):** `fetch('/api/availability?date=2026-09-14&therapistId=cmtv6bgww0008xzio3wzarym5')`
- **Obtido:** 200, com `slots` de 09:00 a 16:00 e `available:true`.
- **Controle:** a mesma chamada com o trainer B devolve a mesma grade. A rota não distingue tenant.
- Com o Bearer do app, a resposta é **307 para `/login`**.

### ISO-5 — REPROVOU
- **Request (aluno B):** `POST /api/appointments` com `{"dateTime":"2026-09-14T10:00:00.000Z","treatmentType":"QA ISO-5 cross-tenant","therapistId":"cmtv6bgww0008xzio3wzarym5"}`
- **Obtido:** 200 "Appointment booked successfully"; id `cmtv6lrtd000cxzlswky14bmh`.
- **`clinicId`:** `null` na resposta e no banco.

### ISO-6 — REPROVOU
- **Request (aluno B):** `POST /api/appointments` sem `therapistId`
- **Obtido:** 200; id `cmtv6ls8u000gxzlseerbis91`, atribuído a um usuário **real** do tenant A (ADMIN, não reservável). Nome e e-mail não foram registrados.
- **`clinicId`:** `null`.
- **Causa:** `prisma.user.findFirst({ where: { role: { in: ["ADMIN","THERAPIST","SUPERADMIN"] } } })`, sem filtro de tenant e sem olhar `bookable`. A mesma consulta, rodada só em leitura, devolveu esse ID.

### ISO-7 — REPROVOU
- **Request (aluno B, papel PATIENT):** `fetch('/api/admin/body-assessments/cmtv6fh7h0001xzwoeg0a7qlo')`
- **Obtido:** 200, com 89 campos, inclusive `patient.email`.
- São dois vazamentos: um paciente acessa uma rota de admin, e lê dado de outro tenant. O GET só verifica se existe sessão.

### ISO-8 — metade SOAP não testada; metade paciente REPROVOU
- **8a:** não testado (não havia nota SOAP de fixture).
- **8b — Request (trainer B):** `fetch('/api/patients/cmtv6bgws0006xziogparfo52')`
- **Obtido:** 200, com `medicalScreening`, `patientAppointments` e `soapNotesFor`.
- No fixture esses campos estavam vazios; num paciente real viriam a triagem e as notas SOAP.

### ISO-9 — REPROVOU
- **Request (trainer B):** `fetch('/api/patients/cmtv6bgws0006xziogparfo52', {method:'DELETE'})`. Foi o único DELETE do QA.
- **Obtido:** 200 `{"success":true}`.
- **Verificação:**
  - `GET /api/admin/patients/...` passou a devolver 404.
  - No banco, o usuário e a avaliação `BA-QA-00001` sumiram (cascade).
  - Os pacientes do tenant A caíram de 2 para 1.

### ISO-10 — REPROVOU
- **Request:** `POST /api/mobile/register` com qa.novo
- **Obtido:** 201, com `"clinicId":null,"clinicName":null`; `null` também no banco.
- A rota não aceita slug nem convite.

### ISO-11 — PASSOU
- **Request (trainer B):** `fetch('/api/admin/exercises')`
- **Obtido:** 1 exercício (QA Goblet Squat), de 15 no banco.

### ISO-X1 (derivado) — REPROVOU
- **Request (trainer B):** `fetch('/api/appointments?viewAll=true')`
- **Obtido:** 200 com 5 agendamentos: 2 do aluno B e **3 de pacientes reais fora do tenant B**. Só a contagem foi registrada. Todos com `clinicId null`.
- A tela `/admin/appointments` mostra "All (0)": a interface filtra, a API não.

## Detalhes — fluxo do personal (web)

### PT-1 — PASSOU
- **Screenshot:** `t-2-pt1-admin-trainer.png`
- `/staff-login` leva a `/admin`. O card mostra "QA Studio PT — Admin · ENTERPRISE".
- O resto é da BPR: logo, título "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond" e rodapé.

### PT-2 — PASSOU (ressalva)
- **Screenshots:** `t-2-pt2-*.png`
- A lista mostra "1 patient".
- A ficha mistura inglês e português (Perfil Pendente, Screening, Notas Clínicas, Rehab Agent, SOAP Note, Gerar AI Assessment).
- A aba Exercícios mostra "QA Goblet Squat — 3 sets · 10 reps · 3x per week", com editar e excluir.
- **Ressalva:** não há botão claro para nova prescrição (só "Add folder").

### PT-3 — PASSOU
- **Screenshot:** `t-2-pt3-biblioteca-exercicios.png`
- "1 exercise"; nada do tenant A.

### PT-4 — PASSOU (ressalva)
- **Screenshots:** `t-2-pt4-*.png`
- O diálogo "New Appointment" lista só o aluno B e **não tem seletor de profissional**.
- Oferece 6 tratamentos de fisioterapia em libras (Initial Assessment £75 … Shockwave £70) que não são do tenant B. Suspeita de lista fixa em `lib/types.ts:150`, não confirmada.
- A disponibilidade existe em `/admin/appointments/availability`.
- O formulário não foi submetido.

### PT-5 — vocabulário registrado
- patient 11, clinic/clinical 5, therapist 1, SOAP 1, screening 2, treatment 1.
- Não há rótulo configurável para aluno, personal ou treino.

## Detalhes — fluxo do aluno

### AL-1 — PASSOU (ressalva)
- **Screenshots:** `t-2-al1-*.png`
- O `/login` diz "Patient Portal". O dashboard fica bloqueado por "Terms & Consent Required", com termos da BPR ("laws of England and Wales", "999 / A&E").
- Depois do aceite, `/dashboard/screening` ainda mostrou o bloqueio (estado desatualizado).
- O onboarding "Welcome to BPR!" tem 4 passos: perfil, termos, triagem médica e primeira consulta.
- Appointments, My Health, Exercises e Learn aparecem com cadeado.
- O nome "QA Studio PT" não aparece em nenhuma tela.

### AL-2 — REPROVOU
- **Screenshot:** `t-2-al2-exercicios-aluno.png`
- A tela mostra o paywall "Upgrade your plan… From £0.90/month". O treino prescrito não aparece no web, embora o app o devolva.

### AL-3 — REPROVOU
- **Screenshots:** `t-2-al3-*.png`
- `/dashboard/appointments/book`, aberto pela URL direta, carrega **sem paywall** e oferece "QA qa.trainer | QA qa.fisioa".
- Achado lateral: o paywall é contornável pela URL.

### AL-4 — PASSOU (ressalva)
- **Login mobile:** 200, com `clinicName "QA Studio PT"`.
- O token do aluno carrega `canViewAllPatients: true` e `canCreateClinicalNotes: true` (padrões do `User`).
- **`/api/mobile/modules`:** 3 módulos genéricos.
- **`/api/exercises`:** devolve a prescrição com `videoUrl`, `thumbnailUrl` e `muteForPatient` (vazios no fixture).
- **Ressalva:** `/api/availability` com Bearer devolve 307.

## Console
- **Trainer B:**
  - aviso de `key` faltando e **`<a>` dentro de `<a>` (erro de hidratação)** em `components/patients/patients-list.tsx`;
  - um 404, esperado, depois do ISO-9.
- **Aluno B:** sem erros.

## Efeitos colaterais (banco local) e limpeza
- **Criados:** agendamentos `cmtv6lrtd000cxzlswky14bmh` e `cmtv6ls8u000gxzlseerbis91`, usuário `qa.novo@example.test` e refresh tokens.
- **Alterado:** o aluno B aceitou os termos.
- **Removidos pelo ISO-9:** `qa.pacientea` e `BA-QA-00001`.
- **E-mails:** o dev server local enviou e-mails **reais** via Resend. Foram 2 para o `ADMIN_EMAIL` (avisos de agendamento do ISO-5 e ISO-6) e 3 para `qa.aluno@example.test`, que vão dar bounce. Evidência: `[EMAIL] Sent via Resend …` no log do dev server.
- **Limpeza (sessão principal, após o QA):** removidos 4 usuários `qa.*`, 2 agendamentos, 1 prescrição, 1 exercício, 10 disponibilidades, 2 refresh tokens e o tenant `qa-studio-pt`.

## Achados confirmados em runtime

| # | Cenário | Vazamento | Causa |
|---|---|---|---|
| 1 | ISO-1 | Admin B lê a ficha completa de paciente A | `GET /api/admin/patients/[id]` não compara tenant |
| 2 | ISO-3 | Aluno B vê profissionais de outros tenants | `GET /api/therapists` filtra só `bookable`/ativo |
| 3 | ISO-4 | Aluno B vê a agenda livre de profissional A | `GET /api/availability` aceita qualquer profissional |
| 4 | ISO-5 | Aluno B agenda com profissional A; agendamento sem tenant | `POST /api/appointments` não valida nem grava `clinicId` |
| 5 | ISO-6 | Agendamento cai num admin real do tenant A | busca por papel, sem tenant e sem `bookable` |
| 6 | ISO-7 | Paciente lê a avaliação corporal de outro paciente/tenant | `GET /api/admin/body-assessments/[id]` só verifica sessão |
| 7 | ISO-8b | Admin B lê paciente A | `GET /api/patients/[id]` só barra pacientes |
| 8 | ISO-9 | Admin B **apaga** paciente A, com cascade | `DELETE /api/patients/[id]` só verifica ADMIN |
| 9 | ISO-10 | Aluno do app fica sem tenant | `POST /api/mobile/register` não define tenant |
| 10 | ISO-X1 | Admin B lista agendamentos de pacientes reais de fora | `GET /api/appointments?viewAll=true` sem filtro |
| 11 | AL-3 | A tela de agendamento do aluno oferece profissional A | consome o `/api/therapists` (achado 2) |

Isolamento que funcionou: ISO-2, ISO-11 e PT-3.
