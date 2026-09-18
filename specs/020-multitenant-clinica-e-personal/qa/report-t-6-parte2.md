# QA Report — T-6 Parte 2: escopo por tenant das demais rotas

**Data:** 2026-09-10
**Resultado:** ✅ **APROVADO** (subconjunto limpo) — restante realocado, ver abaixo.

## Parte 2a — plataforma só-SUPERADMIN (feita antes)
Logs, coworker, marketing, qualificações, CPD e callback do governo restringidos a SUPERADMIN. Provado: ADMIN de tenant → 401, SUPERADMIN → 200.

## Parte 2b — rotas de staff
Feito agora o **subconjunto sem legado nulo**:
- **Rotas com `patientId`** (`atlas/soap-prefill`, `clinical-scribe/generate-soap`, `clinical-scribe/patient-intelligence`, `medical-screening/analyze`): passam por `staffPatientAccess`. Escopam pelo tenant do **paciente**, então não há problema de `clinicId` legado.
- **`social/instagram-delete`**: escopa o `SocialAccount` (clinicId não-nulável) ao tenant do ator.

**Prova em runtime** (staff do tenant B contra paciente do tenant A):
- `medical-screening/analyze?patientId=<A>` → **404**
- `atlas/soap-prefill` `{patientId:<A>}` → **404**
- `clinical-scribe/patient-intelligence` `{patientId:<A>}` → **404**
- controle: `medical-screening/analyze` do fisio A no próprio paciente → **200**
Suíte de isolamento: **11/11**, sem regressão. `tsc` limpo; 163 testes de unidade.

## Realocado para a T-14 (precisa de backfill antes)
As tabelas com `clinicId` **nulável** — `ClinicBroadcast`, `SalesLead`, `PatientPackage`, `ServicePackage`, `ImageLibrary`, `ConsultationRecording` — não foram escopadas aqui: os registros atuais da clínica têm `clinicId` nulo (confirmado: 3/3 na `ImageLibrary` local), então escopo estrito **esconderia os dados da própria clínica**. A T-14 passa a preencher o `clinicId` dessas tabelas e só então escopar as rotas. Ver `qa/triagem-rotas.md` e `t-14`.

## Realocado para a T-17 (acoplado a design)
Grupo `SiteSettings` (consent-texts, screening-config, patient-portal-config, service-pages, stripe-branding, screening-config público) e e-mail (admin/email, admin/email-config): têm leitura pública/do paciente; escopo depende do mecanismo de tenant público da T-17/T-13.

**Veredito: APROVADO** para o que foi entregue; realocações documentadas.
