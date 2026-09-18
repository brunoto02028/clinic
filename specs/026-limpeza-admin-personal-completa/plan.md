# Atividade 26 — Limpeza COMPLETA do admin do personal

## Objetivo
QA do Bruno (logado como personal em prod) mostrou que **muita coisa clínica/paciente ainda vaza** no admin do personal-trainer. Revisar cada aba/botão e corrigir tudo: **vocabulário** (patient→student, therapist→trainer, treatment→workout, rehabilitation→training, appointment→session, medical/clinical→…) e **esconder features clínicas** que não fazem sentido num estúdio. Inglês UK, clínica **intocada**.

Fonte de verdade: `qa/audit-report.md` (auditoria completa de 18 áreas, categorias A=vocab, B=feature clínica, C=marketing, [PT]=texto hardcoded em português).

## Padrões recorrentes
1. **Vocab hardcoded** não passa por `relabel()` em modais/empty-states/config.
2. **Features clínicas** expostas (Foot Scans, Body Assessment, Blood Pressure, Treatment Plan, Screening, Clinical Notes, My Records, Insoles/Biomechanics/Thermography/MLS Laser, diagnosis/AI, Equipment clínico).
3. **Blocos em português** dentro do UI inglês (aba Messages, labels de Permissões, "(opcional)").

## Estratégia
- **Gatear/esconder** features clínicas para personal (remove a feature E o vocab clínico daquela superfície de uma vez).
- **Revocabular** as páginas que o personal usa de fato (availability, nova sessão, notifications, users, tasks, messages, permissions).
- **Traduzir** blocos PT hardcoded.
- Título da aba (`<title>`) por tenant.

## Lotes (tarefas)
| T-N | Lote | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Portal config | `/admin/patient-portal`: esconder módulos clínicos p/ personal + "patient"→"student" nas 5 abas (Modules/Dashboard/Content/Legal/Preview) | feito (gating; vocab no T-6) |
| T-2 | Settings | `/admin/settings`: esconder sub-abas clínicas (Insoles/Biomechanics/Thermography/MLS Laser) + Portal-landing clínico; branding placeholders | feito (sub-abas clínicas escondidas) |
| T-3 | Permissões | `/admin/patients/[id]/permissions`: esconder categoria "Clinical", traduzir labels PT, vocab | feito (categoria Clinical + status cards escondidos; título relabel) |
| T-4 | Modais | New Appointment/"Session" + New Treatment Plan: vocab + treatment→workout | feito (relabel em ambos os modais) |
| T-5 | Features clínicas | esconder AI/diagnosis (feito+bloqueado) + Equipment (feito) | feito |
| T-6 | Vocab restante | availability (Therapist→Trainer), notifications, users (Therapists/Patients), tasks, ficha Messages (PT→EN), lista (appts/Readiness), my-account, `<title>`, permissões (labels locale-aware), lista PT→EN + warnings React, girths labels | feito |

## QA
Re-rodar o QA Personal (trainer) por área após cada lote; regressão clínica (qa.admina) intacta.
