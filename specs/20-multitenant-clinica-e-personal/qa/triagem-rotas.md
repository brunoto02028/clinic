# Triagem de rotas — T-6

Levantada em 2026-09-10 sobre o código atual. Cobre as rotas autenticadas que usam Prisma e **não** referenciam tenant, **excluindo** as já tratadas na T-3 (avaliação corporal), T-4 (prontuário por ID) e T-5 (agenda).

Classes:
- **tenant** — recurso de uma clínica; precisa do `tenant-access`.
- **plataforma** — ferramenta da plataforma/do dono; deve ficar só com SUPERADMIN.
- **usuário** — escopo pelo próprio usuário; já está correto.
- **público** — leitura pública, sem dado sensível.

Nota importante: o middleware **não barra paciente em `/api/admin/*`** (o `staffRoutes` só casa `/admin`). Uma rota de admin que só confere a sessão é acessível a qualquer paciente logado.

## Prioridade 1 — corrigir primeiro

| Rota | Problema | Classe | Correção |
|---|---|---|---|
| `admin/impersonate` + consumo em `lib/get-effective-user.ts` | Admin de um tenant "entra como" paciente de **outro** tenant. O middleware aceita o cookie `impersonate-patient-id` de qualquer ADMIN/SUPERADMIN, então dá para forjar sem passar pela rota. Todas as rotas do paciente passam a responder como aquele paciente: é um bypass completo do isolamento | tenant | Validar no ponto de consumo (`getEffectiveUser`): o paciente impersonado precisa pertencer ao tenant do admin real; e validar também na rota ao iniciar |
| `admin/education/content/[id]` (GET, PUT, DELETE) | **Só sessão:** paciente lê, edita e apaga conteúdo educativo | tenant | staff + `EducationContent.clinicId` |
| `admin/social/posts/[id]` (GET, PUT, DELETE), `admin/social/templates/[id]` (DELETE) | **Só sessão:** paciente edita e apaga posts e templates | tenant | staff + `clinicId` |
| `admin/agent-keys` + `agent/leads`, `agent/patients` | As chaves de agente não têm tenant, e as rotas de agente devolvem dados de todos os tenants. O ADMIN de qualquer tenant cria uma chave e lê pacientes e leads de todos | plataforma | Gestão de chaves só para SUPERADMIN (hoje é **só ADMIN**, então o SUPERADMIN nem consegue). Chaves por tenant ficam para quando existir integração por tenant |
| `foot-scans/[id]/progress` | Qualquer usuário logado lê o progresso de qualquer scan | tenant | dono do scan ou staff do tenant (`FootScan.clinicId`) |
| `payments/create-checkout` | Não confere se o agendamento é de quem paga | tenant | paciente dono do agendamento ou staff do tenant |
| `payments/verify` | Localiza o pagamento pelo ID da sessão Stripe | — | **Sem ação**: consulta a própria Stripe e só marca como pago o que a Stripe confirma; a resposta não expõe dado sensível |

## Prioridade 2 — escopo por tenant

| Rota(s) | Hoje | Classe | Correção |
|---|---|---|---|
| `admin/articles/[id]/generate-seo`, `admin/articles/import`, `admin/articles/bulk-import` | papel, sem tenant | tenant | artigo do tenant do ator (`Article.clinicId`) |
| `admin/articles/[id]/notify`, `notify-preview`, `notify-test` | papel, sem tenant; dispara para a lista global de e-mails | plataforma | só SUPERADMIN (a lista `EmailContact` não tem tenant) |
| `admin/atlas/soap-prefill`, `admin/clinical-scribe/generate-soap`, `admin/clinical-scribe/patient-intelligence` | papel; recebem `patientId` | tenant | `staffPatientAccess` |
| `admin/clinical-scribe/recordings`, `recordings/[id]` | papel, sem tenant | tenant | `ConsultationRecording.clinicId` |
| `admin/broadcasts` | papel; mensagens a pacientes | tenant | `ClinicBroadcast.clinicId` e destinatários do tenant |
| `admin/consent-texts`, `admin/screening-config`, `patient-portal-config`, `admin/service-pages`, `admin/stripe-branding`, `screening-config` | `SiteSettings` sem tenant (provável `findFirst`) | tenant | `SiteSettings` do tenant do ator |
| `admin/email`, `admin/email-config` | caixa de e-mail e contas sem tenant | tenant (+ plataforma para `SystemConfig`) | `EmailAccount.clinicId`; chaves globais só SUPERADMIN |
| `admin/patient-packages`, `admin/service-packages` | papel, sem tenant | tenant | pacotes e paciente do tenant |
| `admin/sales`, `admin/sales/[id]` | papel, sem tenant | tenant | `SalesLead.clinicId` |
| `image-library`, `image-library/[id]`, `upload` | sem tenant | tenant | `ImageLibrary.clinicId` |
| `medical-screening/analyze` | papel; recebe `patientId` | tenant | `staffPatientAccess` |
| `foot-scans/[id]/upload-local` | confere o paciente dono; staff sem tenant | tenant | staff do tenant do scan |

## Plataforma — restringir a SUPERADMIN

| Rota(s) | Hoje | Motivo |
|---|---|---|
| `admin/system-logs` | ADMIN e SUPERADMIN | logs da plataforma inteira |
| `admin/coworker/*`, `admin/marketing/*`, `admin/social/instagram-delete` | ADMIN e SUPERADMIN | ferramentas de marketing da BPR; `MarketingPost`/`CoWorkerTask` não têm tenant — o ADMIN de outro tenant veria os posts da BPR |
| `admin/qualifications/*`, `admin/cpd-courses/*` | ADMIN e SUPERADMIN | CPD/qualificações do dono, sem tenant |
| `government/callback/companies-house` | ADMIN e SUPERADMIN | grava tokens em `SystemConfig` (global) |
| `admin/clinics`, `admin/clinics/[id]`, `admin/exercises/backfill-duration`, `admin/exercises/normalize-videos`, `admin/maintenance/setup-admin` | já SUPERADMIN | ok |
| `admin/maintenance/clear-images` | segredo em header | ok |

## Usuário e público — sem ação

| Rota(s) | Por quê |
|---|---|
| `admin/study/*` | escopo por dono (`ownerId`/`userId`) |
| `dashboard/stats`, `education/progress`, `exercises` | escopo pelo próprio paciente |
| `admin/email-test` | envia teste ao próprio usuário |
| `clinics`, `clinics/[slug]` | dados públicos da clínica |
