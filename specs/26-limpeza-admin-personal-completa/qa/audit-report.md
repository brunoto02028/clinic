# Auditoria QA — Admin do Personal Trainer (2026-09-11)

Logado como `qa.trainer@example.test` (tenant PERSONAL). A=vocab clínico · B=feature clínica · C=marketing · [PT]=texto português no UI inglês.

**Já OK:** nav (Students/Training/Sessions), "View as Student", "Student Invite Link", Finance, ficha abas Summary/Documents/Workouts/Assessments, dashboard principal.

## GLOBAL
- A — `<title>` = "Bruno Physical Rehabilitation - … Richmond" em todo `/admin/*` → deveria ser o nome do estúdio.

## 1. Portal config `/admin/patient-portal` → Modules (MAIS GRAVE)
Módulos clínicos toggláveis: **Foot Scans, Body Assessment, Blood Pressure, Treatment Plan, My Records (treatment history/clinical notes), Assessment Screening, Clinical Notes, My Documents (medical), Marketplace (rehab products), Community (patients), BPR Journey (rehabilitation)**. Cabeçalho "…patient sidebar navigation". Appointments→Sessions, Dashboard desc cita "records and screening".

## 2. Permissões `/admin/patients/[id]/permissions` (MUITO GRAVE)
- A "Patient Permissions"; cards "Screening/Incomplete", "Treatment/No package"; categoria "Clinical" (2x).
- [PT] nomes de módulo todos em português (Painel, Meu Perfil, Triagem de Avaliação, Consultas, Plano de Tratamento, Meus Registros, Notas Clínicas, etc.).
- [PT] Detailed Permissions em português (Agendar Consulta, Chat com Terapeuta, etc.).
- A/B descrições clínicas (screening, treatment protocol, clinical notes, clinic visits, therapist, rehabilitation).

## 3. Settings `/admin/settings` → General (GRAVE)
- B sub-abas **Insoles, Biomechanics, Thermography, MLS Laser**.
- A sub-aba Portal: "Your Rehabilitation Portal", "Medical Screening", "Advanced Treatments", "clinical notes", "Stethoscope".
- A branding placeholders ("Bruno Physical Rehabilitation", "Your rehabilitation journey…"); logo overrides "Patient Login/Dashboard".

## 4. Modal New Appointment `/admin/appointments` (GRAVE)
- A "New Appointment" (home diz "New Session" — inconsistente), "…appointment for a patient…", "Patient *", "Treatment Type", "Pay at the clinic", "Appointment Notes/Clinical notes", "Create Appointment".

## 5. Modal New Treatment Plan `/admin/treatment-plans` (GRAVE)
- A/B "New Treatment Plan", "Specific/All/No Patient", "Post-Surgery Rehabilitation", "Treatments", "treatment catalog/types".

## 6. AI/diagnosis `/admin/patients/[id]/diagnosis` (feature clínica)
- A/B "AI Assessment & Treatment", aba "Treatment Protocol", "Send Report to Patient", "patient data". Quick-link "AI" na lista.

## 7. Equipment `/admin/equipment`
- A "Clinic Equipment", "SOAP pre-fill", "treatment plan suggestions", "Load MLS MPHI 75", "clinic equipment / treatments".

## 8. Portal sub-abas Dashboard/Content/Legal/Preview
- Dashboard: "patient dashboard", card "Clinical Notes", "Book Appointment/physiotherapy", "View Records/clinical notes/rehabilitation", "Treatment Plan", "Body Assessment/posture".
- Content: "welcome message patients see", "rehabilitation progress", "Screening Alert", "medical screening", "Complete Your Medical Screening".
- Legal: "patients must accept", "Consent for Treatment", "clinical analysis", "patient-friendly".
- Preview: "Live Patient Dashboard", "Patient:", "All Patient Pages" (todos os cards clínicos); iframe nav "My Health"→/dashboard/clinical-notes, logo "BPR".

## 9. Tasks `/admin/patient-tasks`
- A "Patient Action Requests", "one patient/several/all", "Patient *", "Send to Patient". [PT] "(opcional)".

## 10. Availability `/admin/appointments/availability`
- A "Therapist Availability", "Patients will only see…", "displayed to patients", "Patients won't see…".

## 11. Notifications `/admin/notifications`
- A "Patient Notifications", "all patients", "All patients (3)/Select patients".

## 12. Ficha aba Messages `/admin/patients/[id]` — [PT] 100% português + "paciente"
- "Nenhuma mensagem… com este paciente", "Mensagem/Aviso", "Escreva a sua mensagem ao paciente…", "Enviar ao paciente", etc.

## 13-18 (menores)
- Sessions list: botão "New Appointment" (heading "Sessions").
- Lista alunos: "0 appts", badge "No Readiness", quick-link "AI"→/diagnosis.
- Training→Workouts empty: "No treatment plans yet", "assign treatments to patients" (URL /admin/treatment-plans).
- Exercises: botão "Instagram" (import? verificar).
- Users: stats "Therapists", "Patients", sub-aba "Patients (3)".
- My Account: email placeholder "you@clinic.com".
- Menores: Exercises da ficha "prescribed/Prescribed by"; New Assessment labels crus "armRelaxed/armFlexed".
- Console: warnings React em `components/patients/patients-list.tsx` (key prop; <a> aninhado).
