# Code review — T-1 (isolamento multi-tenant e prontidão para personal)

Revisão estática em 2026-09-10 sobre `main` (61a9c14). Severidades conforme o plan.md.
"Confirmar no QA" = o cenário correspondente da `qa-spec.md` prova (ou refuta) em runtime.

## Foto do modelo atual

- **Existe base de tenant:** `Clinic` + `User.clinicId`, papéis `SUPERADMIN` (dono da plataforma) / `ADMIN` (admin da clínica) / `THERAPIST` / `PATIENT`, permissões por staff (`canViewAllPatients`, ...), módulos por clínica (`ClinicModuleAccess`), `Subscription` por clínica, campos de Stripe Connect em `Clinic`.
- **84 de 156 modelos têm `clinicId`.** Os 72 sem são majoritariamente filhos (itens, tokens, logs) ou por usuário.
- **Prod hoje (leitura, sem PII):** 1 clínica; 2 SUPERADMIN + 4 PATIENT; **2/2 appointments e 7/7 disponibilidades com `clinicId` NULL**.
- Como todo staff de prod é SUPERADMIN (que ignora o tenant), **os caminhos de isolamento de ADMIN/THERAPIST nunca rodaram em produção**.

## Crítico — vazamento ou destruição de dados entre tenants/pacientes

| # | Onde | Problema | QA |
|---|------|----------|----|
| C1 | `app/api/admin/body-assessments/[id]/route.ts:14-35` | GET só exige sessão. **Qualquer usuário logado, inclusive PATIENT**, lê a avaliação corporal de qualquer paciente por ID — com email e telefone. Vaza entre pacientes, não só entre tenants. | ISO-7 |
| C2 | `app/api/patients/[id]/route.ts:157-185` | DELETE exige só `role === "ADMIN"` e faz `user.delete({ where: { id } })`: o admin de **qualquer** tenant apaga **qualquer usuário** (nem restringe a PATIENT — pega staff também), e o cascade leva o prontuário. | ISO-9 |
| C3 | `app/api/admin/patients/[id]/route.ts:14-70` e `:99-215` | GET devolve o prontuário completo (triagem, SOAP, diagnósticos IA, protocolos, pressão, documentos) a staff de qualquer tenant. PATCH apaga nota SOAP (`:201`), edita triagem e foot scan **por ID sem checar tenant**. | ISO-1 |
| C4 | `app/api/soap-notes/[id]/route.ts` | GET/PUT/DELETE só checam o PATIENT dono; **staff de qualquer tenant** lê, edita e apaga nota clínica de outro tenant. | ISO-8 |

Padrão correto já existe no próprio código: `app/api/foot-scans/[id]/route.ts:48-52` (paciente só o próprio; staff só se `user.clinicId === scan.clinicId`). É ele que deve ser generalizado.

## Alto — bloqueia o segundo tenant

| # | Onde | Problema | QA |
|---|------|----------|----|
| A1 | `app/api/signup/route.ts:100`, `lib/auth-options.ts:90` | Cadastro web e Google atribuem `clinic.findFirst({ isActive: true })` **sem `orderBy`** → todo aluno novo cai "na primeira clínica" (e com 2+ clínicas a escolha é indeterminada). Não existe convite/link do tenant. | — |
| A2 | `app/api/mobile/register/route.ts` | Registro pelo app cria PATIENT com `clinicId` **null** → aluno sem tenant. | ISO-10 |
| A3 | `lib/resolve-clinic-id.ts`, `lib/clinic-context.ts` (`withClinicFilter`), `app/api/admin/exercises/route.ts:39` | **Fail-open:** sem `clinicId` o filtro some (`if (clinicId) where.clinicId = ...`) ou cai para a primeira clínica do banco. 53 usos de fallback single-tenant. Qualquer conta com `clinicId` null enxerga tudo. | ISO-11 |
| A4 | `app/api/therapists/route.ts:24`, `app/api/availability/route.ts:39`, `app/api/appointments/route.ts:142,157`, `app/api/public/schedule/route.ts:15` | **Agenda sem tenant:** lista profissionais de todos os tenants; aceita `therapistId` de outro tenant; aluno sem `therapistId` recebe o "primeiro staff da plataforma"; o agendamento é gravado **sem `clinicId`**; staff marca sessão para `patientId` de qualquer tenant; horário público = primeiro profissional da plataforma. | ISO-3..6 |
| A5 | varredura | **127 de 241** rotas autenticadas que usam Prisma não referenciam tenant. As do paciente (`userId`) estão ok; as de staff são o risco — maiores grupos: `admin/patients` (6), `admin/body-assessments` (4), `admin/clinical-scribe` (4), `soap-notes` (2), `admin/exercises` (2), `admin/clinics` (2). | parcial |
| A6 | `prisma/schema.prisma` `User` | **Um aluno = um tenant:** `email @unique` global + um único `clinicId`. O aluno do personal que também é paciente da clínica não consegue ter as duas contas (registro devolve 409). | — |
| A7 | pagamentos | `Clinic.stripeAccountId/stripeOnboarded` existem, mas **nenhum checkout usa** `transfer_data`/`on_behalf_of`/`stripeAccount` (só são lidos em `app/api/external/finance`). Todo pagamento de qualquer tenant cairia na conta Stripe da plataforma. | — |
| A8 | `Subscription` | `maxTherapists`/`maxPatients` **nunca são verificados** — o plano SaaS não limita nada. | — |
| A9 | `middleware.ts` | SUPERADMIN sem o cookie `selected-clinic-id` opera sem tenant (`activeClinicId = null`). Aceitável para o dono da plataforma, mas hoje é o modo de operação da clínica real. | — |
| A10 | branding | Fixo no código: `bpr.clinic` em 122 arquivos, "Bruno Physical" em 90, "BPR" em 132 (ex.: prefixo de pedido `'BPR'` em `lib/clinic-context.ts`). `Clinic` tem logo/cores, mas o app não é white-label. `SystemConfig` (chaves de IA, `SLOT_INTERVAL_MINUTES`) é global da plataforma. | PT-1, AL-1 |

## Médio — bloqueia o uso por personal trainer

| # | Onde | Problema |
|---|------|----------|
| M1 | `ExercisePrescription` | Tem séries/reps/isometria/descanso/frequência (texto). **Sem carga (kg), RPE/RIR, cadência, progressão semanal.** O retorno do aluno é só `completedCount` — sem registro por série/sessão (carga e reps feitas, esforço). Força e hipertrofia dependem disso. |
| M2 | modelo | **Não existe "treino"** (Treino A/B/C, divisão semanal, sessão com ordem e supersets). A prescrição é uma lista de exercícios soltos; `TreatmentProtocol.weeklyTrainingSchedule` é JSON e orientado a reabilitação. |
| M3 | `Appointment` | Um único `patientId` → **sem aula em grupo** (turma, small group, bootcamp). |
| M4 | UI | Vocabulário clínico fixo: "patient" ~1.000 ocorrências na UI, "clinic" ~460, "therapist" ~160. Onboarding do aluno exige triagem médica e consentimento clínico (`mod_screening` sempre visível). |
| M5 | `mobile/` | O app é **só do lado do aluno** (`(clinica)`: treino, agenda, educação, check-in). Não há app do profissional: o personal prescreve e agenda apenas pela web. |

## Positivo — o que já serve

- `/api/exercises` (aluno) filtra por `patientId = userId`; entrega `videoUrl`/thumbnail — vídeos no R2 (`media.bpr.clinic`).
- `admin/patients` (lista) filtra por `clinicId`.
- Middleware remove `x-user-*`/`x-clinic-id` forjados em chamadas Bearer.
- `mobile/work/*` (módulo **BA — "Business & community"**: orçamentos, faturas, compliance, follow-ups) é escopado por usuário — reaproveitável pelo personal.
- Pacotes e recorrência já existem (`TreatmentPlan` SUBSCRIPTION, `MembershipPlan`, `ServicePackage`) — adaptáveis a mensalidade de personal.
