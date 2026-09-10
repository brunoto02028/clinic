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
