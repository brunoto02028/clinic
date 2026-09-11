# Atividade 22 — Acesso branded por tenant (personal trainer + alunos)

## Objetivo
Dar ao **personal trainer** (tenant `PERSONAL_TRAINER`) uma **entrada própria, branded e escopada por slug** — separada do `/login` e `/staff-login` genéricos da clínica. O trainer compartilha o link do seu estúdio; ele e seus **alunos** entram por ali, veem marca + cores do estúdio e vocabulário de **estúdio/trainer/aluno** (não "clínica/staff/paciente"), e o aluno cai num **"Student Portal"**. Os fluxos da clínica ficam **intocados**.

Decisões do usuário (2026-09-11):
- Personal × clínica → **entrada branded por tenant (URL própria por slug)**.
- Aluno × paciente → **portal do aluno branded via link do estúdio**.

## Contexto (estado atual, do mapeamento)
- `/login` (paciente+staff juntos) e `/staff-login` (staff) são **genéricos** e mostrados **antes** de saber o tenant. `clinicType` só é conhecido **após** o login (token) → aí entram gates (`middleware` personal gate, `lib/personal-blocked-routes`) e vocabulário (`hooks/use-vocab`, `lib/tenant-vocab`: paciente→aluno, clínica→estúdio, terapeuta→trainer).
- `/join/[slug]` já é **branded por tenant** (cadastro) via `resolveJoinTenant` (`lib/join-tenant.ts`) → renderiza `SimplifiedSignupForm`.
- Branding disponível por tenant: `Clinic.primaryColor/secondaryColor`, logo, `name`, `slug` (`prisma schema:295-321`).
- Redirect pós-login é por **role** (ADMIN/THERAPIST→`/admin`, PATIENT→`/dashboard`) em `login-form.tsx`, `staff-login`, `middleware`. Não há `redirect` callback no NextAuth.
- Não há roteamento por subdomínio (isolamento por `x-clinic-id`).

## Decisões de design
| # | Decisão | Por quê |
|---|---|---|
| D1 | **Rota branded de login: `/studio/[slug]`** (trainer + aluno logam aqui). Signup continua em `/join/[slug]`. Prefixo `studio/` evita colisão com rotas top-level. | Entrada própria por slug sem quebrar `/login`/`/staff-login` |
| D2 | **Escopo por tenant:** resolve o slug (reusa `resolveJoinTenant`); **404** se slug desconhecido/inativo **ou não-personal** (clínica não ganha página studio). Após credenciais, **assert `user.clinicId === tenant.id`**; mismatch → rejeita com mensagem clara (paciente da clínica não entra por link de estúdio e vice-versa). SUPERADMIN isento. | Separação real de acesso, não só visual |
| D3 | **Branding** aplicado na página (cores/logo/nome do estúdio) a partir do registro do tenant. Fallback à marca padrão se vazio. | Identidade do estúdio na entrada |
| D4 | **Vocabulário pré-login** direto (sabemos que é personal pelo slug): "Sign in to \<Studio\>", "Student Portal", "Trainer", "Student" — sem depender do `useVocab` pós-login. | O ganho principal sobre o `/login` genérico |
| D5 | **Redirect por role** preservado: trainer→`/admin`, aluno→`/dashboard`; mantém `callbackUrl`. | Reusa o que já existe |
| D6 | **Clínica intocada:** `/login` e `/staff-login` sem mudança de comportamento. | Não regredir a clínica |
| D7 | **Trainer compartilha o link:** no admin do personal, exibir os links copiáveis do estúdio (login `/studio/[slug]` + convite `/join/[slug]`). | O trainer precisa distribuir aos alunos |
| D8 | **Student Portal branded pós-login:** `/dashboard` do aluno de tenant personal mostra "Student Portal" + marca + vocabulário de aluno (preencher lacunas do que o `useVocab` não cobre, ex.: branding/título). | Fecha a separação aluno×paciente na área logada |
| D9 | **Middleware:** `/studio/[slug]` como rota pública (é página de auth); garantir que o personal gate não a bloqueie. | Acesso à entrada |

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Rota branded de login `/studio/[slug]` (resolve tenant, personal-only, branding + vocab) | concluído (QA + review) |
| T-2 | Auth escopada por tenant no login branded (assert clinicId, rejeição cross-tenant, redirect por role) | concluído (QA + review) |
| T-3 | Signup branded `/join/[slug]` com vocabulário estúdio/aluno + branding (auditar/ajustar) | pendente |
| T-4 | Student Portal branded pós-login (`/dashboard` do aluno personal: título/marca/vocab) | pendente |
| T-5 | Exibir links do estúdio no admin do personal (login + convite, copiáveis) | pendente |
| T-6 | Guards: middleware público p/ `/studio/[slug]`; clínica `/login`/`/staff-login` inalterados; personal gate não bloqueia | pendente |

## Suposições (validar com o Bruno)
1. **Prefixo de URL** `/studio/[slug]` (alternativas: `/s/[slug]`, `/[slug]/login`). Assumo `studio`.
2. **Login cross-tenant por link de estúdio é REJEITADO** com mensagem (não redireciona silenciosamente para a área correta do usuário).
3. **Clínica NÃO ganha página branded** por ora (só personal). Se quiser branded para clínica também, é extensão futura.
4. **Branding** usa `primaryColor/secondaryColor/logo/name` do tenant; se vazios, cai na marca padrão.
5. **Sem subdomínio** — continua por slug/rota.
6. O trainer é `ADMIN` do tenant personal; alunos são `PATIENT`. Sem novos roles.
7. Deploy backend por push; telas mobile (se tocarmos) via EAS.
