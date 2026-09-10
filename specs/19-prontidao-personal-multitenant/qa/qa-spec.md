# QA Spec — Atividade 19 (prontidão personal + multi-tenant)

Ambiente: **somente local** — `http://localhost:4170`, banco `bpr_clinic_local`. Nunca prod.
Autenticação: sim (web por sessão/cookie; app por Bearer via `/api/mobile/login`).

Fixtures (senha de todos: fornecida no prompt do QA):

| Conta | Papel | Tenant |
|---|---|---|
| `qa.trainer@example.test` | ADMIN (o "personal") | B — QA Studio PT |
| `qa.aluno@example.test` | PATIENT (aluno) | B |
| `qa.fisioa@example.test` | THERAPIST | A — clínica do Bruno |
| `qa.pacientea@example.test` | PATIENT (descartável) | A |

**Regra de segurança:** DELETE só contra o ID de `qa.pacientea`. Nenhum outro ID.

Uma falha de isolamento = o teste **reprova** e o achado é **confirmado**.

## Isolamento entre tenants (T-2)

| ID | Tipo | Como | Esperado (correto) |
|----|------|------|--------------------|
| ISO-1 | API | Logado como **trainer B**: `GET /api/admin/patients/{pacienteA}` | 403/404. Reprova se 200 com dados do paciente A |
| ISO-2 | API | Trainer B: `GET /api/admin/patients` | Só pacientes do tenant B (aluno B); sem paciente A |
| ISO-3 | API | Logado como **aluno B**: `GET /api/therapists` | Só profissionais do tenant B; reprova se `qa.fisioa` aparece |
| ISO-4 | API | Aluno B: `GET /api/availability?date=<próxima segunda>&therapistId={fisioA}` | 403/vazio; reprova se devolve horários |
| ISO-5 | API | Aluno B: `POST /api/appointments` com `therapistId={fisioA}` | 403; reprova se cria. Registrar `clinicId` do agendamento criado |
| ISO-6 | API | Aluno B: `POST /api/appointments` **sem** `therapistId` | Deve cair num profissional do tenant B. Registrar qual foi atribuído e o `clinicId` gravado |
| ISO-7 | API | Aluno B: `GET /api/admin/body-assessments/{bodyAssessmentA}` | 403. Reprova se 200 com dados do paciente A |
| ISO-8 | API | Trainer B: `GET /api/soap-notes/{id}` e `GET /api/patients/{pacienteA}` | 403/404 |
| ISO-9 | API | Trainer B: `DELETE /api/patients/{pacienteA}` (**só esse ID**) | 403. Reprova se 200 e o usuário some |
| ISO-10 | API | `POST /api/mobile/register` com `qa.novo@example.test` | Aluno novo vinculado a um tenant. Registrar `clinicId` gravado |
| ISO-11 | API | Trainer B: `GET /api/admin/exercises` | Só exercícios do tenant B |

## Fluxo do personal — web (T-2)

| ID | Tipo | Como | Esperado |
|----|------|------|----------|
| PT-1 | UI | Login do trainer B | Chega em `/admin`. Screenshot; anotar branding/nome exibido |
| PT-2 | UI | `/admin/patients` → abrir aluno B | Aluno listado; existe caminho para prescrever exercício |
| PT-3 | UI | `/admin/exercises` | Biblioteca; anotar se aparecem exercícios do tenant A |
| PT-4 | UI | `/admin/appointments` | Consegue criar sessão com o aluno B; existe tela de disponibilidade do profissional |
| PT-5 | UI | Vocabulário | Registrar os termos exibidos (patient/clinic/therapist/SOAP/triagem) |

## Fluxo do aluno — web e app (T-2)

| ID | Tipo | Como | Esperado |
|----|------|------|----------|
| AL-1 | UI | Login do aluno B → `/dashboard` | Screenshot; anotar branding e passos obrigatórios (triagem, consentimento) |
| AL-2 | UI | `/dashboard/exercises` | Vê "QA Goblet Squat" 3×10 |
| AL-3 | UI | `/dashboard/appointments` (agendar) | Só o(s) profissional(is) do tenant B |
| AL-4 | API | `POST /api/mobile/login` (aluno B) → `GET /api/mobile/modules`, `GET /api/exercises`, `GET /api/appointments` com Bearer | Token emitido; módulos do tenant; prescrição com campos de vídeo |

## Limpeza
- Rodar o script de limpeza dos fixtures (remove só `qa.*@example.test`, `BA-QA-*` e o tenant `qa-studio-pt`).
