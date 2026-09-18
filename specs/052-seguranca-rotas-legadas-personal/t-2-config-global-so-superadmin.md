# T-2: Configuração global da BPR só para SUPERADMIN

**Status:** em andamento
**Depende de:** nenhuma (vai para prod junto com a T-3)

## Objetivo
Nenhum staff de tenant (ADMIN/THERAPIST de clínica ou personal) consegue alterar o que é **da plataforma/BPR**: site público, termos de consentimento, config do portal, preços e pacotes globais, artigos do blog, perfil da conta Stripe da plataforma. E as abas de plataforma somem do menu de quem não é SUPERADMIN.

## Contexto
Confirmado ao vivo: o personal passa na checagem de `PUT /api/settings`. Outras rotas globais, confirmadas lendo o código:

| Rota | Problema |
|---|---|
| `app/api/settings/route.ts:101` (PUT) | aceita `["SUPERADMIN","ADMIN","THERAPIST"]` e grava `siteSettings.findFirst()` |
| `app/api/admin/consent-texts/route.ts:107-126` | grava os termos que todos os pacientes da BPR aceitam |
| `app/api/patient-portal-config/route.ts:283-310` (PUT) | grava a config do portal de todos |
| `app/api/admin/stripe-branding/route.ts:52-104` (POST) | altera o `business_profile` da conta Stripe da plataforma |
| `app/api/admin/service-prices/route.ts` | POST grava preço com `clinicId: null`, DELETE por id sem tenant, GET lista tudo |
| `app/api/admin/service-packages`, `patient-packages`, `service-access` | GET lista de todos os tenants; POST edita pacote de outro tenant / concede acesso pago a qualquer paciente |
| `app/api/articles/route.ts:78-83`, `app/api/articles/[id]/route.ts:52-56,128-139,156-165` | qualquer ADMIN/THERAPIST cria, edita ou apaga artigos da BPR. PUT com `notifySubscribers` dispara a newsletter |

Menu: `lib/admin-sections.ts` → Settings mostra General, Users, Studios, AI, Security, Logs para o personal. Studios/AI/Logs dão 401 na API, e General edita o site da BPR.

## Passos
1. Criar (ou reusar, se já existir) um helper `requireSuperadmin()` no padrão de `lib/tenant-access.ts`.
2. Aplicar nas **escritas** das rotas da tabela. Leituras públicas que o site/portal precisam (ex.: `GET /api/settings`, `GET` de consent-texts pelo aluno) continuam como estão.
3. `service-prices` / `service-packages` / `patient-packages` / `service-access`:
   - escrita global (`clinicId: null`) → só SUPERADMIN;
   - listas e escritas de tenant → filtradas por `clinicId` do actor (`getActor`);
   - conceder acesso/pacote → só a paciente do mesmo tenant (`staffPatientAccess`).
4. Artigos: escrita → SUPERADMIN. `notifySubscribers` → SUPERADMIN.
5. Menu (`lib/admin-sections.ts`): tabs `general`, `clinics`, `ai`, `security`, `logs` de Settings marcadas como só SUPERADMIN (novo flag, ex.: `superadminOnly`). O filtro de seções respeita o flag. Para o personal, Settings mostra Users e a aba de marca do estúdio (T-3).
6. As páginas dessas abas redirecionam o não-SUPERADMIN para `/admin` (defesa por URL, não só menu).

## Decisões tomadas na implementação
- **Helper:** `getSuperadminActor(request)` em `lib/tenant-access.ts`. Relê o papel do banco e ignora impersonação.
- **Pricing & Plans Hub** (`service-prices`, `service-packages` (+`/ai`), `patient-packages`, `service-access`): **inteiro só SUPERADMIN**. São os preços globais da BPR e pacotes criados na conta Stripe da BPR. Preço por clínica/estúdio fica para depois (o personal cobra pelo Connect, ativ. 28). A página `/admin/service-pricing` e a aba Finance → Pricing seguem a mesma regra.
- **Config do portal do aluno** (`/admin/patient-portal`, aba Students → Portal): é uma linha só para todos os tenants, então passa a ser só SUPERADMIN. Um personal configurar os módulos dos **próprios** alunos exige config por tenant, o que fica para a atividade 055.
- **Bloqueio por URL:** lista em `lib/superadmin-routes.ts` (Edge-safe), aplicada no `middleware.ts` para ADMIN/THERAPIST.
- **Menu:** flag `superadminOnly` em `AdminTab`, respeitado por `visibleAdminSections(isPersonal, isSuperadmin)` e por `SectionTabs` (recebe `role` do layout).

## Arquivos afetados
- `app/api/settings/route.ts`, `app/api/admin/consent-texts/route.ts`, `app/api/patient-portal-config/route.ts`, `app/api/admin/stripe-branding/route.ts`
- `app/api/admin/service-prices/route.ts`, `service-packages`, `patient-packages`, `service-access`
- `app/api/articles/route.ts`, `app/api/articles/[id]/route.ts`
- `lib/admin-sections.ts` (+ onde as seções são filtradas), páginas `app/admin/{settings,clinics,ai-settings,security,system-logs}/page.tsx`
- `lib/tenant-access.ts` (helper)

## Critérios de aceite
- [ ] Personal (ADMIN) → escritas de todas as rotas da tabela → **403**; SUPERADMIN → continua funcionando.
- [ ] `SiteSettings` e artigos inalterados depois das tentativas do personal (conferido no banco).
- [ ] `GET /api/settings` (site público) e termos do aluno continuam funcionando sem login/como aluno.
- [ ] Personal: menu Settings **não** mostra General/Studios/AI/Security/Logs; acessar essas URLs → redireciona para `/admin`.
- [ ] SUPERADMIN: vê todas as abas como antes.
- [ ] Clínica BPR (SUPERADMIN): editar e salvar o site funciona (regressão).
