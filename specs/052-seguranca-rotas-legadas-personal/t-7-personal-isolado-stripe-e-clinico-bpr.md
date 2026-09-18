# T-7: Personal isolado do Stripe e das rotas clínicas da BPR

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Dinheiro de aluno do personal nunca cai na conta Stripe da BPR. O personal e o aluno não alcançam as rotas clínicas (nem página, nem API) que ainda escapam do `personal-blocked-routes`.

## Contexto
- **Menu do personal:** Finance → Pricing mostra os serviços clínicos da BPR (Consultation £100, Treatment Session, Foot Scan, Body Assessment, "Patient Access Override"). Memberships e Marketplace também aparecem.
- **Stripe global da BPR:** treatment plans (`/api/patient/treatment-plans/checkout:61`), memberships (`/api/patient/membership/subscribe:144`), pacotes (`/api/admin/patients/[id]/packages` + `/checkout`, `/api/patient/packages/checkout`) e pagamento online de sessão (`/api/payments/create-checkout:90`, `admin/appointments` com `paymentMode:"online"`) cobram todos na conta Stripe global da BPR.
- **Rotas escondidas só no menu, abertas por URL** (crawl de 18/09): `/admin/treatment-plans` (dá 500 no stripe-branding), `/admin/screening-preview`, `/admin/equipment`, `/admin/treatment-types`.
- **APIs clínicas não bloqueadas** (auditoria):
  - `/api/admin/rehab-plans/recent`, `/api/admin/screening/[id]`, `/api/medical-screening` (+ `/analyze`);
  - `/api/admin/body-assessments/*` (inclui `generate-notes` com `callAIClinical`), `/api/admin/appointments/generate-notes`;
  - `/api/admin/patients/[id]/documents/generate`, `/api/admin/patients/[id]/report`;
  - `/api/admin/journey/ai-coach`, `/api/patient/protocol`, `/api/patient/rehab-plan`.
- **Não bloquear** `exercise-prescriptions`: a aba "Exercises" da ficha do aluno usa essa rota (decisão de unificar fica para a atividade de 1º uso).

## Passos
1. `lib/personal-blocked-routes.ts`:
   - adicionar as páginas e APIs clínicas acima;
   - adicionar as rotas de pagamento da BPR para o tenant personal: `/admin/treatment-plans`, `/admin/memberships`, `/admin/service-pricing`, `/admin/marketplace`, `/api/admin/treatment-plans`, `/api/admin/memberships`, `/api/admin/service-prices`, `/api/admin/patients/<id>/packages`, `/api/patient/treatment-plans`, `/api/patient/membership`, `/api/patient/packages`, `/api/patient/marketplace`, `/dashboard/membership`, `/dashboard/marketplace`.
2. Pagamento online de sessão no tenant personal:
   - `create-checkout` e `paymentMode:"online"` → recusados com mensagem clara ("pagamento presencial");
   - a UI de agendamento do personal não oferece "pagar online".
3. Menu (`lib/admin-sections.ts`): Pricing, Memberships e Marketplace com `clinicalOnly`. Para o personal, Finance fica com Overview e a cobrança via Connect (ativ. 28).
4. Portal do aluno (`lib/patient-sections.ts`): esconder "Plans & Membership" e Marketplace do aluno do personal.
5. Conferir o ramo Bearer do middleware (mobile): o bloqueio personal também vale para `/api/patient/*` via Bearer (hoje o ramo retorna antes, `middleware.ts` ~262).

## Arquivos afetados
- `lib/personal-blocked-routes.ts`
- `middleware.ts` (ramo Bearer)
- `lib/admin-sections.ts`, `lib/patient-sections.ts`
- `app/api/payments/create-checkout/route.ts`, `app/api/admin/appointments/route.ts` (recusa de pagamento online para personal)

## Critérios de aceite
- [ ] Personal: `/admin/treatment-plans`, `/admin/memberships`, `/admin/service-pricing`, `/admin/marketplace`, `/admin/screening-preview` → redireciona.
- [ ] Personal: as APIs correspondentes → 403.
- [ ] Personal: menu Finance sem Pricing/Memberships/Marketplace.
- [ ] Aluno do personal (cookie **e** Bearer): `/api/patient/treatment-plans/checkout`, `/api/patient/membership/subscribe`, `/api/patient/packages/checkout`, `/api/patient/protocol`, `/api/patient/rehab-plan` → bloqueado.
- [ ] Aluno do personal: `/dashboard/membership` e `/dashboard/marketplace` redirecionam, e não aparecem no menu.
- [ ] Sessão de personal com pagamento online → recusada com mensagem; presencial funciona.
- [ ] Aba "Exercises" da ficha do aluno continua funcionando.
- [ ] Clínica BPR: nada disso muda (treatment plans, memberships, pacotes, pagamento online, screening). Regressão com `qa.admina`/`qa.pacientea`.
