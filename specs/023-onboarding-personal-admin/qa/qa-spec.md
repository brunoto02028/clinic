# QA — Atividade 23 (onboarding personal por admin)

Ambiente: dev local + fixtures. SUPERADMIN = `qa.superadmin@example.test` (senha `QaTenant#2026`). Prod não tocada.

## T-1 — tipo + slug
- **UI**: SUPERADMIN em `/admin/clinics` → Add → Type "Personal Studio" + slug → cria. Verificar no banco `type=PERSONAL_TRAINER`, `slug` salvo.
- **UI**: Type "Clinic" → `type=CLINIC` (regressão).
- **API (negativo)**: slug duplicado → erro tratado (não 500 cru).
- **API (auth)**: não-SUPERADMIN → 401.

## T-2 — dono do estúdio
- **UI/API**: criar estúdio com dono (nome/e-mail) → existe `User` role=ADMIN, clinicId = novo estúdio.
- **UI**: logar como o dono em `/staff-login` (senha definida) → cai em `/admin` personalizado (nav personal: Students/Training/Sessions) → vê card "Your studio links".
- **API (negativo)**: e-mail já existente → erro claro; clinic não fica sem dono silenciosamente.
- **Fluxo aluno**: `/join/[slug]` do novo estúdio → cadastra aluno → entra no portal do aluno (Workouts).

## T-3 — handover
- **UI**: o novo estúdio na lista de clinics mostra `/studio/[slug]` e `/join/[slug]` copiáveis + e-mail do dono; um clinic comum não mostra.

## Runtime (isolamento)
- Cenário: estúdio recém-criado é `PERSONAL_TRAINER` → aluno vê treino/avaliacoes e não clínica (já coberto por M6–M9); confirmar que o novo tenant herda o gate.
