# Relatório final — Atividade 19 (prontidão personal + multi-tenant)

**Data:** 2026-09-10
**Base:** code review estático (`code-review.md`, T-1) e QA em runtime com um segundo tenant (`report-t-2.md`, T-2).

## Veredito

**O sistema não está pronto para um segundo tenant.** O modelo de dados já prevê multi-tenant (`Clinic`, `clinicId` em 84 modelos, papéis, módulos por clínica, Stripe Connect no schema), mas o isolamento **não é aplicado nas rotas**.

No QA com um "personal" de outro tenant:
- **9 de 11 tentativas de acesso cruzado funcionaram**;
- houve **uma exclusão de paciente de outro tenant**.

Hoje isso não aparece em produção só porque há um tenant e todo o staff é SUPERADMIN.

Para personal trainer, faltam também:
- estrutura de treino de força;
- identidade própria do tenant: nome, marca e vocabulário.

## Achados — prioridade

Legenda: ✅ confirmado em runtime · 📄 só estático (código lido, não executado).

### Crítico — vazamento ou destruição de dados

| # | Achado | Evidência |
|---|---|---|
| C1 | **Paciente lê a avaliação corporal de qualquer outro paciente** (`GET /api/admin/body-assessments/[id]` só exige sessão). **Vale hoje em prod**, com um tenant só | ✅ ISO-7 |
| C2 | Admin de um tenant **apaga** qualquer usuário de outro tenant, com cascade no prontuário (`DELETE /api/patients/[id]`) | ✅ ISO-9 |
| C3 | Admin de um tenant lê o prontuário completo de paciente de outro (`GET /api/admin/patients/[id]`, `GET /api/patients/[id]`). O PATCH apaga nota SOAP por ID | ✅ ISO-1, ISO-8b · 📄 PATCH |
| C4 | Admin de um tenant lista agendamentos de pacientes de todos os tenants (`GET /api/appointments?viewAll=true`) | ✅ ISO-X1 |
| C5 | Staff de um tenant lê, edita e apaga nota SOAP de outro (`/api/soap-notes/[id]`) | 📄 |

### Alto — impede abrir o segundo tenant

| # | Achado | Evidência |
|---|---|---|
| A1 | Agenda sem tenant. O aluno vê profissionais e horários de outros tenants e agenda com eles; sem profissional escolhido, cai num admin real de outro tenant; o agendamento é gravado sem `clinicId`. Em prod: 2/2 agendamentos e 7/7 disponibilidades com `clinicId` NULL | ✅ ISO-3..6, AL-3 |
| A2 | Aluno do app fica sem tenant (`/api/mobile/register`). Web e Google jogam todo aluno na "primeira clínica" (`findFirst` sem `orderBy`) | ✅ ISO-10 · 📄 web/Google |
| A3 | Filtro de tenant *fail-open*: sem `clinicId`, o filtro some ou cai na primeira clínica. São 53 fallbacks, e 127 de 241 rotas autenticadas não referenciam tenant | 📄 |
| A4 | Um aluno só pode estar em um tenant (`email` único global + um `clinicId`) | 📄 |
| A5 | Todo pagamento cai na conta Stripe da plataforma: o Connect não é usado em nenhum checkout | 📄 |
| A6 | Limites do plano SaaS (`maxPatients`, `maxTherapists`) nunca são aplicados | 📄 |
| A7 | Marca fixa (BPR/bpr.clinic em 120+ arquivos); termos e consentimento da BPR para o aluno de qualquer tenant | ✅ PT-1, AL-1 · 📄 |

### Médio — impede o uso por personal trainer

| # | Achado | Evidência |
|---|---|---|
| M1 | A prescrição não tem carga, RPE/RIR, cadência nem progressão; o aluno só registra "feito" (`completedCount`) | 📄 |
| M2 | Não existe "treino" (A/B/C, ordem, supersets, semanas): são exercícios soltos | 📄 |
| M3 | Não há aula em grupo: `Appointment` tem um único aluno | 📄 |
| M4 | O aluno de um tenant novo fica atrás do paywall da BPR e **não vê o treino no web** (o app mostra) | ✅ AL-2 |
| M5 | Vocabulário e fluxo clínicos fixos: Patient, Therapist, SOAP, triagem médica obrigatória, catálogo de tratamentos de fisioterapia em libras | ✅ PT-4, PT-5, AL-1 |
| M6 | Não há botão claro de nova prescrição na ficha do aluno | ✅ PT-2 |
| M7 | O app é só do aluno; o personal prescreve e agenda só pela web. `/api/availability` não aceita o token do app (307) | ✅ AL-4 · 📄 |

## Fora do escopo — aviso, não corrigido

1. **O dev local envia e-mail real.** O `.env` local tem a chave do Resend: o QA mandou 2 e-mails para o `ADMIN_EMAIL` e 3 para `example.test` (bounce). Qualquer teste local de agendamento faz o mesmo.
2. **O paywall do aluno é contornável pela URL:** `/dashboard/appointments/book` abre sem plano.
3. **Erro de hidratação** (`<a>` dentro de `<a>`) e `key` faltando em `components/patients/patients-list.tsx`.
4. **O token do app de um paciente carrega flags de staff** (`canViewAllPatients`, `canCreateClinicalNotes` = true, padrões do `User`). Hoje o `requirePermission` barra o PATIENT antes de ler as flags; o efeito em outras rotas não foi explorado.
5. **Consentimento com estado desatualizado:** depois de aceitar os termos, `/dashboard/screening` ainda mostra o bloqueio.

## O que já serve

- A lista de pacientes e a biblioteca de exercícios do admin isolam por tenant (ISO-2, ISO-11, PT-3).
- `foot-scans/[id]` implementa o isolamento correto; é o padrão a generalizar.
- O aluno recebe a prescrição com os campos de vídeo pelo app; os vídeos ficam no R2.
- A disponibilidade do profissional já tem tela (`/admin/appointments/availability`).
- O módulo **BA** do app (orçamentos, faturas, compliance), escopado por usuário, serve ao personal.
- Pacotes e recorrência (`TreatmentPlan` SUBSCRIPTION, `MembershipPlan`, `ServicePackage`) são adaptáveis a mensalidade.

## Roadmap

Detalhado em `../t-3-relatorio-roadmap.md`. Resumo:

| Fase | Conteúdo | Gatilho |
|---|---|---|
| **0 — Segurança** | Helper único de acesso por tenant aplicado a C1–C5; filtro que falha fechado; suíte automatizada com os cenários ISO-* | **C1 já é problema em prod** |
| **1 — Fundação multi-tenant** | Cadastro por link ou código do tenant; agenda escopada; backfill de `clinicId`; fim do "primeira clínica"; Stripe Connect; limites do plano | Pré-requisito do 2º tenant |
| **2 — Identidade do tenant** | White-label; configuração por tenant; tipo de tenant (clínica × personal) controlando vocabulário, termos e módulos obrigatórios | Personal não pode ver BPR/SOAP |
| **3 — Produto do personal** | Treino A/B/C, carga/RPE/progressão, registro por série no app, aula em grupo, mensalidade | Uso diário do personal |
| **4 — App do profissional** | Agenda do dia, prescrição rápida e registros dos alunos no app | Hoje é só web |

**Decisão pendente antes da Fase 1:** um aluno pode pertencer a mais de um tenant? Se sim, `User.clinicId` vira um vínculo usuário↔tenant — e isso muda todas as consultas.
