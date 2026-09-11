# Atividade 23 — Onboarding do personal trainer (provisionado por admin)

## Objetivo
A "porta de entrada" do personal: o **SUPERADMIN** cria um **estúdio** (tenant `PERSONAL_TRAINER`) e a **conta do trainer** (ADMIN) num fluxo em `/admin/clinics`. O trainer então entra por `/staff-login`, cai no admin do estúdio (já personalizado, Atividade 20/22) e compartilha os links do estúdio (`/studio/[slug]` e `/join/[slug]`, Atividade 22) com os alunos.

Decisão do usuário (2026-09-11): **provisionamento por admin** (não autocadastro público — fica como fase 2 futura).

## Contexto (estado atual)
- `POST /api/admin/clinics` (SUPERADMIN) cria o clinic recebendo `name, slug, email, phone, address, city, postcode` — **mas não seta `type`** (todo tenant nasce `CLINIC`) e o form não expõe tipo. `PATCH /api/admin/clinics/[id]` faz `data: body` (aceitaria `type`).
- `POST /api/admin/users` (SUPERADMIN/ADMIN) cria staff: `email, password, firstName, lastName, role, targetClinicId`; faz `bcrypt.hash`, cria o `User` e **envia e-mail com senha temporária + link `/staff-login`**.
- Login branded, links do estúdio e portal do aluno **já existem** (Atividade 22).

## Decisões de design
| # | Decisão | Por quê |
|---|---|---|
| D1 | Form de criação em `/admin/clinics` ganha **seletor de tipo** (Clinic \| Personal Studio) + **slug** (sugerido pelo nome). POST passa a setar `type`. | Poder criar um tenant PERSONAL pela UI |
| D2 | O mesmo fluxo cria o **dono do estúdio (trainer, ADMIN)**: campos nome/e-mail; backend cria o clinic e então o `User` ADMIN (`targetClinicId` = novo clinic) reusando o mecanismo de `/api/admin/users` (senha temporária + e-mail com link do staff-login). | O trainer precisa de conta para entrar; reusa o fluxo existente |
| D3 | Sem nova superfície de auth: compõe os endpoints existentes; SUPERADMIN-only como já é `/admin/clinics`. | Menor risco |
| D4 | Após criar, a UI mostra os **links do estúdio** (`/studio/[slug]`, `/join/[slug]`) + o dono, para o superadmin repassar. | Handover imediato |
| D5 | Slug é `@unique`: o form trata colisão (erro claro) e sugere a partir do nome. | Evitar erro cru |

## Tarefas
| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Tipo (Clinic/Personal Studio) + slug no form e no POST de criação de clinic | concluído (QA) |
| T-2 | Criar o dono do estúdio (trainer ADMIN) no mesmo fluxo (compõe clinic + user + e-mail) | concluído (QA) |
| T-3 | Handover: mostrar links do estúdio + dono após criação (na lista/detalhe de clinics) | concluído (QA) |

## Suposições (validar)
1. **Senha do trainer:** senha temporária gerada + e-mail com link `/staff-login` (reusa `/api/admin/users`); troca no 1º login. (Alternativa: link de convite set-password — não usado hoje.)
2. **E-mail:** infra de e-mail funciona em prod; no QA local validamos que o usuário é criado e loga com a senha definida (sem e-mail real).
3. **Slug:** único; colisão retorna erro tratável; sugerido a partir do nome (kebab-case).
4. **Escopo:** só provisionamento por admin. Autocadastro público = fase 2 (não nesta atividade).
5. Sem mudança no fluxo da clínica; criar CLINIC continua igual (tipo default Clinic).

## QA (resumo — detalhes em qa/qa-spec.md)
- SUPERADMIN cria "Personal Studio" com slug + dono → tenant criado com `type=PERSONAL_TRAINER`; user ADMIN criado no tenant.
- Trainer loga em `/staff-login` com a senha → cai em `/admin` (personalizado personal) → vê "Your studio links".
- Aluno acessa `/join/[slug]` → cadastra → entra no portal do aluno.
- Regressão: criar uma **Clinic** normal continua `type=CLINIC` e sem quebra.
- Slug duplicado → erro tratado.
