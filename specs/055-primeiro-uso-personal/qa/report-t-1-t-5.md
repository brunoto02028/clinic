# QA — Atividade 55, T-1 a T-5 (lado do aluno)

- **Data:** 18/09/2026
- **Código:** working tree da branch `brunoto02028/Personal`, já com os ajustes de T-2 feitos durante a rodada: `mod_recordings`, `mod_records`, `mod_documents`, `mod_clinical_notes` e `learn` fora do menu do aluno de estúdio.
- **Ambiente:** Next dev em :4002, fixtures locais, e-mail desligado. Playwright com Chromium 1243 e contexto novo em cada rodada.
- **Executado por:** agente qa-tester. Nenhum código da aplicação foi alterado.
- **Cobertura:** as 15 linhas da qa-spec (1.1 a 5.3) e mais 7 cenários derivados.

| Tarefa | Veredito |
|---|---|
| T-1 Acesso liberado | **APROVADO com ressalvas** (R-1, R-2 → corrigidas, reteste em `report-t-9-reteste.md`) |
| T-2 Menu do aluno | **APROVADO** |
| T-3 Termo de treino | **APROVADO** (ressalvas baixas R-3, R-4) |
| T-4 Onboarding sem triagem | **APROVADO** (R-6 → corrigida) |
| T-5 Marca no título e no `/join` | **APROVADO com ressalva** (R-5 → corrigida) |

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | `qa.aluno`: `/dashboard`, `/appointments/book`, `/education` e agendamento | UI | ✅ sem "Upgrade your plan" nem "£0.90"; POST 200 e "Appointment Confirmed!" |
| 1.2 | `qa.aluno`: GET `/api/patient/access` | API | ✅ 20 módulos e 11 permissões (motivo `studio` em `computePatientAccess`) |
| 1.3 | trainer esconde Community e trava Quizzes em Permissions | UI | ✅ os dois saem do menu; o travado mostra cadeado por URL (ver R-1) |
| 1.4 | `qa.pacientea` sem plano | UI+API | ✅ paywall em Appointments, My Health, Exercises e Learn; acesso idêntico ao do HEAD |
| 2.1 | `qa.aluno`: menu em 1366 e 390 | UI | ✅ sem Exercises, How It Works, Learn, Records, Documents, Recordings e Clinical Notes; Community continua; 14 itens com 200 e sem redirect |
| 2.2 | `qa.pacientea`: menu | UI | ✅ Exercises, Learn, How It Works e Screening continuam; extras liberados aparecem |
| 3.1 | `qa.aluno`: `/dashboard/consent` em EN e PT | UI+API | ✅ "Training Terms of Service" / "Termos de Serviço de Treino"; nome do estúdio 14×; "Bruno Physical Rehabilitation" 0× |
| 3.2 | anônimo: `/join/qa-studio-pt` até o passo 3 e link dos termos | UI | ✅ "you agree to QA Studio PT's Training Terms" → `/studio/qa-studio-pt/terms` (EN e PT) |
| 3.3 | `qa.pacientea`: `/dashboard/consent` | UI+API | ✅ termo da BPR, idêntico byte a byte ao do anônimo e do SUPERADMIN |
| 4.1 | trainer: Onboarding na ficha do aluno e Preview | UI+API | ✅ só "Complete profile"; `screeningMissing:false` |
| 4.2 | `qa.aluno`: onboarding no dashboard | UI | ✅ 3 passos (Profile, Terms, Book Session), nenhum de triagem |
| 4.3 | admina: `qa.pacientea` sem triagem | UI+API | ✅ "Submit medical screening" pendente; `screeningMissing:true` |
| 5.1 | anônimo: `/studio` e `/join` do estúdio | UI | ✅ `<title>` = "QA Studio PT"; `/join` sem header e footer da BPR, com "QA Studio PT · Powered by BPR" |
| 5.2 | `qa.aluno`: páginas do portal | UI | ⚠️ 10 de 14 páginas com "QA Studio PT"; Workouts, Nutrition, Payments e Challenges não (R-5) |
| 5.3 | `/login`, `/join/qa-clinic-a` e portal do paciente A | UI | ✅ título da BPR, com header, footer e link `/terms` da clínica |
| D-1 | acesso do aluno × `lib/patient-access.ts` do HEAD | lib | ✅ aluno 6/0 → 20/11; pacientea idêntico |
| D-2 | SUPERADMIN: GET dos termos (editor) | API | ✅ termo da BPR |
| D-3 | GET dos termos com `?studio=`, anônimo | API | ⚠️ 307 para `/login` (R-3) |
| D-4 | `/studio/qa-clinic-a/terms` | UI | ✅ 404 |
| D-5 | aluno abre rotas clínicas por URL | UI | ⚠️ `/dashboard/recordings` abria (R-2); as demais redirecionam |
| D-6 | Preview do lembrete da clínica | UI | ✅ continua com "Submit your medical screening" |
| D-7 | `/join` do estúdio no passo 3 | UI | ✅ nenhuma conta criada |

## Evidências principais

### 1.2 / D-1
```
[aluno]     GET /api/patient/access -> 200  modules 20 | permissions 11 | hasActiveSubscription false
[pacientea] GET /api/patient/access -> 200  modules 6 (os "always") | permissions []
computePatientAccess: qa.aluno byReason {"always":[6],"studio":[14 mods + 11 perms]} ; qa.pacientea {"always":[6]}
HEAD × agora: aluno 6/0 → 20/11 | pacientea 6/0 → 6/0 (identical: true)
```

### 1.1
```
POST /api/appointments -> 200 {"success":true,"appointment":{"status":"CONFIRMED","dateTime":"2026-09-29T08:00:00.000Z",…}}
/dashboard, /appointments/book, /appointments, /education: upgrade=false, £0.90=false
```
- Screenshots: `t-1-aluno-book.png`, `t-1-aluno-book-horario.png`, `t-1-aluno-book-confirmado.png`, `t-1-aluno-education.png`

### 1.3
```
PATCH {"overrides":{"mod_community":"hidden","mod_quizzes":false}} -> 200
[aluno] access: mod_community false (hidden), mod_quizzes false; 18 módulos; menu sem Community e sem Quizzes
/dashboard/quizzes -> cadeado "Upgrade your plan… View Membership Plans · From £0.90/month"   ← R-1
```
- Screenshots: `t-1-trainer-permissions-community-hidden-quizzes-locked.png`, `t-1-aluno-menu-com-overrides.png`, `t-1-aluno-quizzes-travado.png`

### 2.1 / 2.2
```
aluno: Home, Workouts, Nutrition, Payments, Challenges, Sessions, Messages, Terms & Consent,
       Pending Actions, Quizzes, Achievements, Journey, Community, My Profile (todos 200)
pacientea: Appointments, My Health, Exercises, Learn, Messages, Plans & Membership, Terms & Consent,
           How It Works, Assessment Screening, My Profile
```
- Screenshots: `t-2-aluno-menu-1366-expandido.png`, `t-2-aluno-menu-390.png`, `t-2-pacientea-menu-390.png`, `t-2-pacientea-menu-390-extras.png`, `t-2-pacientea-menu-1366-extras-temporarios.png`

### 3.x
```
[aluno] en-GB -> "Training Terms of Service"   | {studio} 0× | Bruno Physical Rehabilitation 0×
[aluno] pt-BR -> "Termos de Serviço de Treino" | {studio} 0× | Bruno Physical Rehabilitation 0×
[pacientea] -> "Terms & Conditions of Service" ; [super] == [pacientea] byte a byte (7427 bytes)
/join estúdio passo 3: "By creating your account, you agree to QA Studio PT's Training Terms." -> /studio/qa-studio-pt/terms?lang=en
/join clínica passo 3: "…our Terms of Use and Privacy Policy." -> /terms
```
- Screenshots: `t-3-aluno-consent-en.png`, `t-3-aluno-consent-pt.png`, `t-3-join-estudio-passo-termos.png`, `t-3-join-termos-estudio-en.png`, `t-3-join-termos-estudio-pt.png`, `t-3-pacientea-consent-en.png`

### 4.x
```
[trainer] onboarding-pending (aluno)    -> {"profileIncomplete":true,"screeningMissing":false,"consentMissing":false}
[admina]  onboarding-pending (pacientea) -> {"profileIncomplete":true,"screeningMissing":true,"consentMissing":false}
```
- Screenshots: `t-4-trainer-aluno-onboarding-card.png`, `t-4-trainer-aluno-preview-lembrete.png`, `t-4-admina-pacientea-onboarding-card.png`, `t-4-admina-pacientea-preview-lembrete.png`, `t-2-aluno-dashboard-home.png`

### 5.x
```
/studio/qa-studio-pt "QA Studio PT" | /join/qa-studio-pt "QA Studio PT", header 0, footer 0, "Powered by BPR"
/login, /join/qa-clinic-a, /, /dashboard (pacientea): "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond"
```
- Screenshots: `t-5-studio-login-anon.png`, `t-5-join-estudio-anon.png`, `t-5-join-clinica-anon.png`, `t-5-login-anon.png`

## Ressalvas e o que foi feito
| # | Sev. | Achado | Tratamento |
|---|---|---|---|
| R-1 | média | Módulo travado pelo personal mostrava o paywall da BPR ("View Membership Plans · From £0.90"), que leva a uma rota bloqueada | **Corrigido:** `module-gate.tsx`, o aluno de estúdio vê "Esta área ainda não foi liberada pelo seu personal", sem botão de planos |
| R-2 | média | `/dashboard/recordings` (gravação pré-consulta para o fisio) abria por URL; `/dashboard/guide` (guia clínico BPR) também | **Corrigido:** as duas rotas e `/api/patient/consultation-recording` entraram em `PERSONAL_BLOCKED_PATIENT_ROUTES` |
| R-3 | baixa | GET dos termos com `?studio=` exige login | Mantido: o `/join` usa a página pública `/studio/<slug>/terms` |
| R-4 | baixa | O termo cita "treatment"/"clínico" na negativa ("não é tratamento médico…") | Mantido, é intencional. O texto é rascunho e o Bruno revisa |
| R-5 | média | Workouts, Nutrition, Payments e Challenges com título sem o estúdio | **Corrigido:** `title.template` no layout do portal ("My Workouts · <Estúdio>") |
| R-6 | baixa | Card de onboarding concluído citava "screening" | **Corrigido:** o estúdio vê "Profile and consent all done." |

**Fora do escopo** (anotado):
- **Logo e menu:** o logo "bpr" aparece no menu do aluno, e o nome da BPR no menu recolhido. O nome da BPR foi corrigido na T-9; o logo fica para a marca do estúdio no portal.
- **Confirmação de sessão:** dizia "Pay at the clinic on the day". **Corrigido:** o estúdio vê "Your session is already confirmed."
- **E-mail de lembrete:** traz texto e logo da BPR. É envio manual, e fica para uma atividade de e-mails do estúdio.

## Dados alterados e restaurados
- **`qa.aluno.moduleOverrides`:** `null` → overrides do 1.3 → **`null`** (confirmado no banco).
- **`qa.pacientea.moduleOverrides`:** `null` → 5 módulos liberados temporariamente (2.2) → **`null`** (confirmado).
- **Sessão criada no 1.1:** `cmu6xpsfb00emxzjkavstq45k`, apagada pelo trainer (DELETE 200).
- **`/join`:** cadastro não submetido.
- **Lembrete:** só Preview.
