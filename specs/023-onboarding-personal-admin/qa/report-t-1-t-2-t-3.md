# QA T-1 + T-2 + T-3 — Onboarding do personal por admin

**Data:** 2026-09-11
**Ambiente:** dev local :4223, fixtures 2 tenants + SUPERADMIN. Prod não tocada.
**Resultado:** ✅ **APROVADO** (fluxo end-to-end)

> Testadas juntas — é um fluxo único (criar estúdio + dono + handover).

## Evidência (Playwright, como SUPERADMIN)
1. `/admin/clinics` → botão **"Add Clinic / Studio"** abre o dialog (Type/nome/slug/contato/dono).
2. Type = **Personal Studio** → label vira "Studio name", slug auto **`peak-strength-studio`**, preview "Student login: /studio/… · Invite: /join/…", botão "Create studio".
3. Preenchido nome + dono (Alex Trainer, `qa.owner@example.test`) → **Create studio**.

### Verificação no banco
- Clinic **"Peak Strength Studio"** criado com **`type = PERSONAL_TRAINER`**, `slug = peak-strength-studio`.
- User `qa.owner@example.test` criado: **`role = ADMIN`**, `clinicId` = o novo estúdio. ✓

### End-to-end (dono entra)
- Login do dono pelo **link branded do próprio estúdio** (`/studio/peak-strength-studio`) → redirecionou para **`/admin`**.
- Admin **personalizado** (nav Students / Training / Sessions; título "Peak Strength Studio").
- Card **"Your studio links"** com `/studio/peak-strength-studio` e `/join/peak-strength-studio` (Copy). ✓

### T-3 (handover na lista)
- Row do estúdio ganha badge **"Studio"**; dropdown tem **"Copy student login link"** e **"Copy invite link"** (só para tenant personal).

## Backend
- `POST /api/admin/clinics`: aceita/valida `type` (default CLINIC), exige name+slug, **409** em slug duplicado. SUPERADMIN-only.
- Dono criado reusando `POST /api/admin/users` (senha temp + e-mail staff-login). Em dev o e-mail pode não enviar, mas o usuário é criado (create antes do e-mail) — o UI avisa se a criação do dono falhar, sem deixar o clinic "órfão" silenciosamente.

## Observações
- Senha temp do dono é gerada no cliente e enviada por e-mail (não exibida). No QA a senha foi definida no banco só para demonstrar o login.
- Regressão: criar **Clinic** mantém `type=CLINIC` (default) — sem mudança no fluxo clínico.

## tsc
- Sem erros novos.

**Conclusão: APROVADO.**
