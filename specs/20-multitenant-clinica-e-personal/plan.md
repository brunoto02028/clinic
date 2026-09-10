# Atividade 20 — Multi-tenant: clínicas e personal trainers

## Objetivo

Implementar as correções e melhorias levantadas na auditoria (atividade 19). O objetivo é que o sistema atenda **vários tenants** — clínicas **e** personal trainers — com:
- isolamento de dados entre tenants;
- identidade própria de cada tenant;
- no caso do personal, o produto de treino: prescrição com carga, registro por série, aulas em grupo e app.

Tudo **sem quebrar a clínica atual (BPR)**.

Base: `specs/19-prontidao-personal-multitenant/qa/report-final.md`.

## Princípios

1. **A clínica atual fica intacta.**
   - A BPR vira o tenant **padrão**, do tipo `CLINIC`. Toda mudança é compatível com ela.
   - Toda tarefa tem um cenário de **regressão da clínica** no QA.
2. **Separação clara em três trilhas.**
   - **PLATAFORMA:** compartilhado entre os dois tipos de tenant.
   - **CLÍNICA:** só a clínica.
   - **PERSONAL:** só o personal. Fica atrás de `Clinic.type = PERSONAL_TRAINER` e do módulo de treino; nunca aparece para uma clínica.
3. **Falhar fechado.** Sem tenant resolvido, o acesso é **negado** — nunca "a primeira clínica do banco".
4. **Um único ponto de controle.** Todo acesso por tenant passa por `lib/tenant-access.ts`, generalizando o padrão que já funciona em `foot-scans/[id]`.
5. **Migrações aditivas** (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). Em prod, só são aplicadas junto com o push, quando o Bruno pedir.

## Ciclo de cada tarefa

```
implementar → QA (qa-tester, qa/report-t-N.md) → corrigir → QA de novo se reprovou
            → code review (/code-review sobre o diff da tarefa) → corrigir apontamentos → concluído
```

- O QA roda **sempre no banco local**, com 2 tenants de fixture (um clínica, um personal).
- A **guarda de e-mail** (T-1) fica ativa em todo QA, para que nenhum teste mande mensagem real.
- Nenhuma tarefa é marcada concluída sem QA aprovado **e** review feito.

## Decisões de design

| # | Decisão | Por quê |
|---|---|---|
| D1 | Tenant = `Clinic`, com novo campo `type` (`CLINIC` \| `PERSONAL_TRAINER`), padrão `CLINIC` | Separa clínica e personal sem duplicar o modelo; a BPR não muda |
| D2 | `lib/tenant-access.ts`: resolve o ator (sessão web ou Bearer do app) e expõe `assertPatientAccess`, `assertClinicAccess`, `tenantWhere` — todos falham fechado | Um ponto só para revisar e testar |
| D3 | Registro de outro tenant responde **404**, não 403 | Não revela a existência do registro |
| D4 | O SUPERADMIN age sobre o tenant **selecionado** ou, na falta dele, sobre o **tenant padrão**. A visão de todos os tenants fica só nas telas de SUPERADMIN | Em prod o Bruno é SUPERADMIN: com um tenant só, continua vendo exatamente o mesmo |
| D5 | Tenant padrão explícito via `DEFAULT_CLINIC_SLUG`; sem a variável, só vale se houver exatamente uma clínica | Acaba com o `findFirst` indeterminado |
| D6 | Entrada do aluno por `/join/[slug]` (web e Google), `tenantSlug` ou código no registro do app, e convite do profissional. Sem slug, cai no tenant padrão | O fluxo atual da BPR segue igual |
| D7 | Stripe Connect Express com *destination charges*. O tenant padrão continua na conta da plataforma | A BPR não muda de conta |
| D8 | O produto do personal usa modelos **novos** (`Workout`, `WorkoutExercise`, `WorkoutLog`, `WorkoutSetLog`, `ClassSession`, `ClassBooking`) e não altera `ExercisePrescription`/`TreatmentProtocol` | A prescrição clínica não é tocada |
| D9 | Vocabulário por tipo de tenant em `lib/tenant-vocab.ts` (EN/PT), aplicado nas telas que o personal e o aluno usam | "Aluno/treino/personal" sem mexer nos textos da clínica |

## Tarefas

Legenda de trilha: **PLAT** = plataforma · **CLIN** = clínica · **PT** = personal.

### Fase 0 — Base segura (protege a clínica hoje)

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-1 | PLAT | Guarda de e-mail e mensagens fora de produção | concluído |
| T-2 | PLAT | `lib/tenant-access.ts` + testes + fixtures de 2 tenants | concluído |
| T-3 | CLIN | Avaliação corporal — vazamento que existe hoje em prod | concluído |
| T-4 | PLAT | Prontuário por ID (pacientes, notas SOAP, triagem, usuários) | concluído |
| T-5 | PLAT | Agenda (profissionais, disponibilidade, agendamentos, horário público) | concluído |
| T-6 | PLAT | Triagem e correção das demais rotas de staff | concluído (2b: nuláveis→T-14, SiteSettings/email→T-17) |
| T-7 | PLAT | Suíte automatizada de isolamento (`npm run test:tenants`) | concluído |

### Fase 1 — Correções da clínica encontradas na auditoria

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-8 | CLIN | Paywall contornável pela URL | pendente |
| T-9 | CLIN | Erro de hidratação e `key` na lista de pacientes | pendente |
| T-10 | CLIN | Estado de consentimento desatualizado | pendente |
| T-11 | PLAT | Token de paciente sem flags de staff | pendente |

### Fase 2 — Fundação multi-tenant

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-12 | PLAT | `Clinic.type` + tenant padrão explícito; fim dos `findFirst` | base concluída |
| T-13 | PLAT | Entrada do aluno no tenant (`/join/[slug]`, Google, app, convite) | concluído |
| T-14 | PLAT | Backfill de `clinicId` na agenda + obrigatório nas escritas | pendente |
| T-15 | PLAT | Gestão de tenants (SUPERADMIN) + limites do plano | pendente |
| T-16 | PLAT | Stripe Connect (onboarding + checkouts do tenant) | pendente |

### Fase 3 — Identidade do tenant

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-17 | PLAT | Marca por tenant (área logada, login, e-mails, termos) | pendente |
| T-18 | PLAT | Vocabulário por tipo de tenant | mecanismo + navegação; telas pendentes |
| T-19 | PT | Onboarding e módulos do tenant personal | 19a: nav gating ✓; 19b: server gating ✓, catálogo ✓, questionário (estrutura) ✓ — QA+review em cada; falta onboarding 4 passos (dep. T-17) + conteúdo do painel |

### Fase 4 — Produto do personal

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-20 | PT | Modelo e API de treino | concluído (QA 223 jest + 25/25 runtime; review feito) |
| T-21 | PT | Montagem de treino pelo personal (web) | concluído (QA 5/5 Playwright; review feito) |
| T-22 | PT | Treino do aluno + registro de séries (web) | pendente |
| T-23 | PT | Módulo Treino no app do aluno | pendente |
| T-24 | PT | Progresso e aderência para o personal | pendente |
| T-25 | PT | Aulas em grupo | pendente |
| T-26 | PT | Planos e mensalidade do personal | pendente |

### Fase 5 — App do profissional

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-27 | PT | Modo profissional no app (agenda do dia, alunos, registros) | pendente |

### Fase 6 — Marca no admin

| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-28 | PLAT | Rebrand claro do admin (paleta BA1: bone/ink/moss/greige) — **todo o admin, inclusive a clínica** | pendente (planejar antes de implementar; depois do produto do Personal) |

## Suposições (validar com o Bruno)

1. **Nesta atividade, um aluno pertence a um tenant só.** O vínculo usuário↔tenant (aluno do personal e paciente da clínica com o mesmo e-mail) muda as ~250 referências a `clinicId` e fica para uma atividade própria. O `tenant-access` já nasce como ponto único, para facilitar essa troca depois.
2. **Stripe Connect Express**, com taxa da plataforma configurável por tenant e padrão de 0%.
3. **Marca própria na área logada, no login do tenant e nos e-mails.**
   - O site público `bpr.clinic` continua sendo da BPR.
   - Cada tenant tem página em `/clinics/[slug]` e entrada em `/join/[slug]`.
   - Domínio próprio por tenant fica fora desta atividade.
4. **O aluno do personal não passa pela triagem médica clínica**; responde um **questionário de prontidão para atividade física autoral**, revisado pelo painel clínico.
5. **Commit local ao fim de cada tarefa (após QA + review), sem push.** O push (que é o deploy) só quando o Bruno pedir.
6. **O Stripe local está em modo teste.** Se não estiver, o QA da T-16 não cria cobrança e para para confirmar.
