# QA T-1 + T-2 — Login branded `/studio/[slug]` + auth escopada

**Data:** 2026-09-11
**Ambiente:** dev local :4217, banco `bpr_clinic_local`, fixtures 2 tenants (`qa-studio-pt` PERSONAL, `qa-clinic-a` CLINIC). Prod não tocada.
**Resultado:** ✅ **APROVADO**

> T-1 (render branded) e T-2 (auth escopada) foram implementadas e testadas juntas — ambas vivem no mesmo handler de login. Evitou-se um estado intermediário inseguro (login sem escopo).

## Evidência (Playwright)

### T-1 — render branded + roteamento
- `GET /studio/qa-studio-pt` → **200**; renderiza **"Student Portal"**, "Sign in to QA Studio PT", "Access your workouts and assessments", "Create your account" → `/join/qa-studio-pt`, rodapé "QA Studio PT · Powered by BPR". Nenhuma palavra "Clinic/Patient/Staff".
- `GET /studio/qa-clinic-a` (clínica) → **404**. `GET /studio/nao-existe` → **404**.
- Já logado → server redireciona por role (visto: sessão staff em `/studio/...` → `/admin`).

### T-2 — auth escopada por tenant
- **Aluno** `qa.aluno@example.test` → entra e vai a **`/dashboard`**.
- **Trainer** `qa.trainer@example.test` → entra e vai a **`/admin`**.
- **Cross-tenant** paciente da clínica `qa.pacientea@example.test` no link do estúdio → **rejeitado**: permanece em `/studio/qa-studio-pt` com "This account isn't part of QA Studio PT." + link "Go to sign in →" `/login`. **Não** entra em /dashboard nem /admin.
- Credenciais inválidas → erro padrão (sem vazar existência de conta).

## Notas de implementação
- `app/studio/[slug]/page.tsx` (server): resolve o tenant por slug **personal-only** (`type: PERSONAL_TRAINER`, `isActive`); 404 caso contrário; passa branding (nome, logo, cores) + `clinicId` ao form.
- `components/auth/studio-login-form.tsx` (client): form branded; após `signIn`, checa `session.user.clinicId === clinicId` do slug (SUPERADMIN isento). Redireciona por role.
- Rejeição cross-tenant **não faz signout** (o token do usuário já é escopado ao próprio `clinicId` — ele nunca opera neste estúdio de qualquer forma): mostra a mensagem e oferece saída. **Nuance:** o usuário fica autenticado no próprio tenant; ao sair pelo link vai para a própria área. Sem brecha de isolamento (o boundary é o `clinicId` do token, já aplicado em todo o app).
- `middleware.ts`: `/studio` adicionado às rotas públicas.

## tsc
- Sem erros novos nos arquivos de `studio`.

**Conclusão: APROVADO.**
