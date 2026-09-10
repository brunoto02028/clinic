# QA spec — Atividade 21 (Avaliações do personal)

Ambiente: banco LOCAL, fixtures de 2 tenants (clínica + personal), guarda de e-mail ativa. Nunca produção.

## T-1 — Modelo + API + cálculo
- **API/unidade — %GC:** dado peso 80kg, dobras JP-7 conhecidas, sexo M, idade 30 → densidade/Siri batem com valor esperado (tolerância). BMI/RCQ/massas corretos. (jest puro em `body-composition.ts`.)
- **API happy:** staff do personal POST /api/admin/assessments (studentId do tenant) → 201 com derivados computados; GET lista retorna.
- **API inválida:** %GC fora de faixa / dobras negativas → 400.
- **Auth/isolamento:** sem token → 401; staff da clínica → 404 (módulo TRAINING off); trainer pedindo aluno de outro tenant → 404; aluno GET /api/assessments → só as próprias; aluno de outro tenant → 404. Mobile `/api/mobile/assessments` idem (Bearer).

## T-2 — Fotos + consentimento
- Upload sem `photoConsentAt` → 403. Com consentimento → 201. Foto de outro tenant/aluno → 404. Pose inválida → 400.

## T-3 — Aba na ficha (UI)
- Personal: aba "Assessments" aparece; registrar avaliação (método Dobras) → %GC computado exibido; salva e entra no histórico; tendência aparece. Clínica: aba NÃO aparece (regressão).

## T-4 — Área do aluno web (UI)
- Aluno do personal vê suas avaliações/medidas/fotos + evolução. Paciente da clínica em /dashboard/assessments → estado vazio, sem banner de erro.

## T-5 — App (backend + código)
- `/api/mobile/assessments` (Bearer): personal aluno 200; clínica 404. Telas: tsc limpo (QA de runtime via expo-web/EAS fica com o Bruno).

## T-6 — 1RM + progresso
- Com logs de treino, o progresso mostra 1RM estimado (Epley) por exercício; curvas de peso/%GC/cintura aparecem. Sem dados → estados vazios corretos.

## T-7 — Catálogo
- PT lista/gere `TreatmentType` ASSESSMENT_SERVICE do tenant; isolado por tenant (não vê os de outro).

## Regressão transversal
- `npm run test:tenants` continua verde (nenhum vazamento); a clínica não vê nada novo do personal; `BodyAssessment` clínico intacto.
