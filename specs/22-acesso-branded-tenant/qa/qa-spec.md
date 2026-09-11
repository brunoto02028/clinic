# QA — Atividade 22 (acesso branded por tenant)

Ambiente: dev local com fixtures de 2 tenants (`qa-studio-pt` = PERSONAL_TRAINER; clínica A). Contas `@example.test`, senha `QaTenant#2026`. Prod não tocada.

## T-1 — Rota branded de login
- **UI**: `/studio/qa-studio-pt` renderiza login com nome/cores do estúdio e textos "Sign in to …", "Student"/"Trainer" (não "Clinic/Patient"). → esperado: página branded 200.
- **UI (negativo)**: `/studio/<slug-da-clinica>` → 404. `/studio/inexistente` → 404.
- **UI**: já logado → redireciona por role (trainer→/admin, aluno→/dashboard).

## T-2 — Auth escopada
- **UI/API**: aluno `qa.aluno@example.test` em `/studio/qa-studio-pt` → entra e vai a `/dashboard`.
- **UI/API**: trainer `qa.trainer@example.test` em `/studio/qa-studio-pt` → `/admin`.
- **UI/API (cross-tenant)**: paciente da clínica `qa.pacientea@example.test` em `/studio/qa-studio-pt` → **rejeitado** com mensagem, não entra.
- **UI**: SUPERADMIN não é bloqueado.
- **Auth**: credenciais inválidas → erro padrão (sem vazar se o email existe).

## T-3 — Signup branded
- **UI**: `/join/qa-studio-pt` mostra "join as a student" + marca; link "Already have an account?" → `/studio/qa-studio-pt`.
- **UI**: `/join/<slug-clinica>` inalterado (vocabulário de paciente).

## T-4 — Student Portal
- **UI**: aluno personal logado vê "Student Portal" + marca do estúdio; nenhuma string "Patient/Clinic".
- **UI**: paciente da clínica logado inalterado ("Patient Portal").

## T-5 — Links no admin
- **UI**: trainer em settings vê bloco "Your studio links" com `/studio/[slug]` e `/join/[slug]` copiáveis. Admin de clínica **não** vê o bloco.

## T-6 — Guards
- **Runtime/UI**: `/studio/qa-studio-pt` acessível sem login (200). Personal gate não bloqueia `/studio/*` nem `/join/*`.
- **Regressão**: `/login` e `/staff-login` idênticos (staff→/admin, paciente rejeitado no staff-login como hoje).
- **Runtime isolation**: adicionar cenário garantindo que login escopado rejeita cross-tenant (nível API se aplicável).
