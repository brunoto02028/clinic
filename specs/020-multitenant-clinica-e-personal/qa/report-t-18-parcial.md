# T-18 (parcial) — Vocabulário por tipo de tenant

**Data:** 2026-09-10
**Status:** mecanismo entregue e ligado na navegação; varredura das demais telas pendente.

## O que foi feito
- `lib/tenant-vocab.ts`: reescreve termos clínicos → de personal na string já localizada, só quando o tenant é `PERSONAL_TRAINER`. EN: Patient→Client, Treatment→Workout, Clinical→Training, Therapist→Trainer, Screening→Readiness, Protocol→Program. PT: Paciente→Aluno, Tratamento→Treino, Clínico→Treino, Fisioterapeuta→Personal, Triagem→Prontidão, Protocolo→Programa. (EN usa "Client"; trocável por "Student" se o Bruno preferir.)
- `hooks/use-vocab.ts`: lê `session.user.clinicType` (da T-12) + locale e devolve `relabel(texto)`.
- Ligado na **navegação do admin** (`admin-mini-sidebar.tsx`) e nas **abas de seção** (`section-tabs.tsx`).

## Evidência
`screenshots/t-18-personal-admin.png` — admin do tenant `qa-studio-pt` (marcado `PERSONAL_TRAINER`): a barra lateral mostra **"Clients"** e **"Training"** no lugar de "Patients" e "Clinical". Numa clínica o `relabel` devolve o texto sem mudança (a BPR segue "Patients"/"Clinical").

## Pendente (restante da T-18)
- O **corpo do dashboard** (`/admin`) e as demais telas (lista de pacientes, ficha, agendamento, e-mails) ainda têm termos clínicos fixos ("Total Patients", "Clinic", "Therapists", "Recent Patients"). Aplicar o `useVocab`/`relabel` nesses componentes é a varredura de UI que fecha a T-18.
- Esconder do tenant personal o que é só clínico (SOAP, triagem, Rehab Agent, Evidência) é por módulo (T-19), não por texto.

## Ampliação (opção A — "vai de A", termo EN "Student")
- EN passou a usar **Student** (não Client): Patient→Student.
- Termos ampliados: Clinic→Studio/Estúdio, Appointment→Session/Sessão, Clinician→Trainer, mais os já existentes.
- Substituição agora **case-insensitive com preservação de caixa** (Patients/patients/PATIENTS todos cobertos). Teste de unidade em `__tests__/tenant/tenant-vocab.test.ts` (4 casos, verdes).
- **Varredura ampla:** todos os 41 componentes client que usam o helper `T(key)=i18nT(key,locale)` passaram a envolver o resultado com `relabel`. Um só ponto por componente cobre todas as strings i18n dele.
- **Cabeçalho compartilhado** (`admin-header`): título de seção e busca personalizados (aparece em toda tela do admin).

## Evidência visual (tenant `qa-studio-pt` = PERSONAL_TRAINER, build fresco)
- `screenshots/t-18-personal-admin-full.png` — dashboard: "Students", "Total Students", "Recent Students", "Training Notes", "Trainers", "Manage Students"; "Patients" sumiu do corpo.
- `screenshots/t-18-personal-patients.png` — tela de pacientes: header "Students" + "Search students...", "Student Management", "Manage student records and profiles", aba "Readiness" (era Screening).

## Restante (cauda longa documentada)
Literais **fixos no código** (não passam pelo helper i18n) ainda aparecem em pontos isolados: botão "Add Patient", contador "N patients", selo "No Screening", placeholders/aria-labels espalhados. Fechar 100% é caçar esses literais tela a tela — incremental, de menor valor (o tenant já lê como estúdio nos rótulos, títulos, nav, header e busca). Fica como continuação da T-18.

## Cauda longa — telas-núcleo fechadas
Os literais fixos (que não passam pelo helper i18n) foram envolvidos em `relabel` nas telas que um personal usa no dia a dia:
- **Lista de alunos** (`patients-list.tsx`): "Add Patient"→"Add Student", contador "N patients"→"students", estados vazios, "No Screening"→"No Readiness", "Patient Created!", "Delete Patient".
- **Agendamentos** (`appointments/page.tsx`): busca "Search by patient or treatment...", "Edit Appointment"→"Edit Session", "Treatment Type"→"Workout Type".

## Regra para o restante da cauda (decisão de escopo)
A varredura achou ~150 literais em ~30 arquivos. A maioria está em **módulos só-clínicos** — foot-scans, scans, clinical-ai, recordings, treatment-types clínicos, o `patient-detail` (prontuário: SOAP, triagem, diagnóstico). Para um tenant personal esses módulos devem ser **escondidos pela T-19**, não relabelados — relabelar tela que o personal nunca vê é esforço perdido e ainda deixa "meia-tradução". Então:
- **Telas compartilhadas/núcleo do personal:** relabel (feito: nav, header, dashboard, alunos, agenda).
- **Telas só-clínicas:** T-19 as desliga para o personal; sem relabel.
- **Telas de admin de baixo tráfego** (settings, email, service-pricing…): literais residuais tratáveis de forma incremental, sem urgência.
