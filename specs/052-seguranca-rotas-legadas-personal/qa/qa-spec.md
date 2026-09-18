# QA — Atividade 52 (segurança das rotas legadas)

## Ambiente
- **Banco:** local, com fixtures `node scripts/qa/tenant-fixtures.cjs`. Senha de todas as contas `@example.test`: `QaTenant#2026`.
- **Tenants:**
  - **A** = `qa-clinic-a` (CLINIC): `qa.admina` (ADMIN), `qa.fisioa` (THERAPIST), `qa.pacientea` / `qa.pacientea2` (PATIENT);
  - **B** = `qa-studio-pt` (PERSONAL_TRAINER): `qa.trainer` (ADMIN), `qa.aluno` / `qa.aluno2` (alunos);
  - plataforma: `qa.superadmin`.
- **Servidor de QA sem envio real:** `RESEND_API_KEY=` vazio e sem WhatsApp configurado. Nenhum cenário pode mandar e-mail/mensagem de verdade. Envio em massa é verificado pelos registros criados no banco.
- **Login por API:**
  1. `GET /api/auth/csrf`;
  2. `POST /api/auth/callback/credentials` (form: `csrfToken`, `email`, `password`, `json=true`) com cookie jar;
  3. Bearer do mobile: `POST /api/mobile/login`.
- **UI:** Playwright com browser context novo a cada rodada (ver o gotcha de cache do Next dev).
- **Dados alterados** durante o QA são restaurados no fim de cada cenário.

## T-1 — Aluno fora de `/api/admin/*`

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | API | `qa.aluno` (cookie): GET `/api/admin/finance`, `/api/admin/finance/stripe`, `/api/admin/marketplace/products`, `/api/admin/patient-tasks` | 403 JSON em todas |
| 1.2 | API | `qa.aluno` (cookie): POST `/api/admin/social/upload` com um `.jpg` | 403 |
| 1.3 | API | `qa.aluno` (Bearer): GET `/api/admin/finance` e `/api/admin/workouts` | não autorizado (redirect para login/401/403) |
| 1.4 | API | `qa.aluno`: rota da allowlist (termos) | 200, conteúdo dos termos |
| 1.5 | UI | `qa.aluno` percorre todas as rotas do menu do portal (desktop e 390px) | nenhum 403/4xx novo na rede; páginas renderizam |
| 1.6 | UI | `qa.aluno` abre `/dashboard/consent` | termos aparecem |
| 1.7 | API | `qa.trainer` e `qa.superadmin`: GET de 10 rotas `/api/admin/*` usadas no admin (workouts, meal-plans, patients, challenges, billing-plans, exercises, finance, notifications, patient-tasks, assessments) | mesmo status de antes (200) |
| 1.8 | UI | `qa.trainer` → ficha do aluno → "View as Student" | portal do aluno abre e navega |
| 1.9 | API | sem sessão: GET `/api/admin/finance` | 401/redirect como antes |

## T-2 — Configuração global só SUPERADMIN

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | API | `qa.trainer`: PUT `/api/settings` com o corpo atual do GET | 403; `SiteSettings.updatedAt` inalterado |
| 2.2 | API | `qa.trainer`: escrita em consent-texts, patient-portal-config (PUT), stripe-branding (GET/POST), service-prices, service-packages, patient-packages, service-access | 403 em todas; banco inalterado |
| 2.2b | API | `qa.trainer`: POST `/api/articles` (artigo do próprio estúdio); PUT/DELETE num artigo da BPR; PUT com `notifySubscribers:true` no próprio | 201 com `clinicId` = QA Studio PT; artigo da BPR → 404; newsletter não dispara (só SUPERADMIN) |
| 2.3 | API | `qa.fisioa` (THERAPIST de clínica): PUT `/api/settings` | 403 |
| 2.4 | API | `qa.superadmin`: PUT `/api/settings` com o mesmo corpo | 200 (regressão) |
| 2.5 | API | anônimo: GET `/api/settings`; aluno: termos | 200 (leitura pública preservada) |
| 2.6 | UI | `qa.trainer`: menu Settings; menu Students; menu Finance | Settings: sem General/Studios/AI/Security/Logs, com Branding e Users; Students: sem Portal, com Journey; Finance: sem Pricing |
| 2.7 | UI | `qa.trainer`: abre por URL `/admin/settings`, `/admin/clinics`, `/admin/ai-settings`, `/admin/security`, `/admin/system-logs`, `/admin/patient-portal`, `/admin/service-pricing`, `/admin/stripe-branding` | redireciona para `/admin`; `/admin/analytics` e `/admin/journey` continuam abrindo (são por tenant) |
| 2.8 | UI | `qa.superadmin`: Settings | todas as abas; salvar o site funciona |
| 2.9 | API | `qa.trainer`: GET service-prices, service-packages, patient-packages, service-access | 403 (hub de preços da BPR é só SUPERADMIN); `qa.superadmin` → 200 |

## T-3 — Marca do estúdio

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | UI | `qa.trainer`: Settings → Branding → troca nome, sobe logo, cor `#1E6091` → salva | sucesso; pré-visualização atualiza; logo e nome novos no admin sem relogar |
| 3.2 | UI | anônimo: `/studio/qa-studio-pt` e `/join/qa-studio-pt` | nome, logo e cor novos |
| 3.3 | UI | `qa.aluno` faz login **depois** da mudança | marca nova (logo/cor) no menu do portal |
| 3.4 | API | `qa.trainer`: PATCH `/api/admin/studio-branding` com `{"slug":"x","type":"CLINIC","clinicId":"<A>","primaryColor":"#000000"}` | só a cor muda; slug/type/tenant inalterados |
| 3.5 | API | `primaryColor: "vermelho"` | 400 com mensagem |
| 3.6 | API | `qa.aluno`: PATCH | 403 |
| 3.7 | API | depois de 3.1: `SiteSettings` da BPR | inalterado |
| 3.8 | UI | `/admin` do trainer | "Personalise your studio" marcado como feito e apontando para a aba nova |
| 3.9 | — | restaurar nome/logo/cor originais do QA Studio PT | — |

## T-4 — Agendamentos

Sessão B = `records.appointmentB` das fixtures (aluno `qa.aluno`, £60, CONFIRMED).

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | API | `qa.aluno`: PATCH sessão B `{"price":0.3}` | recusado (400/403); preço continua 60 |
| 4.2 | API | `qa.aluno`: PATCH sessão B `{"dateTime":"<+1 dia>"}` | recusado; data inalterada |
| 4.3 | API | `qa.aluno`: PATCH sessão B `{"status":"CANCELLED"}` | 200 (restaurar para CONFIRMED depois, via trainer) |
| 4.4 | API | `qa.aluno2`: GET/PATCH sessão B | 403/404 |
| 4.5 | API | `qa.admina` (tenant A): GET/PATCH/DELETE sessão B | 404; nada na resposta sobre B |
| 4.6 | API | `qa.trainer`: GET sessão de `records.appointmentA` | 404 |
| 4.7 | API | `qa.aluno`: POST `/api/appointments` com `price: 0.3` | criada com o preço do servidor (≠ 0.3); apagar depois |
| 4.8 | API | `qa.trainer`: POST `/api/admin/appointments` com `patientId` = `qa.pacientea` | 404; nenhuma sessão criada |
| 4.9 | UI | `qa.pacientea`: agenda, remarca pelo fluxo de remarcação e cancela | tudo funciona (regressão clínica) |
| 4.10 | UI | `qa.admina`: cria sessão para `qa.pacientea` pelo admin | funciona (regressão) |

## T-5 — Tarefas em massa

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 5.1 | API | `qa.trainer`: GET `/api/admin/patient-tasks?limit=100000` | só tarefas de alunos de B; tamanho ≤ teto |
| 5.2 | API | `qa.trainer`: POST `{"audience":"all","title":"QA"}` (envio real desligado) | registros criados só para `qa.aluno`, `qa.aluno2` (ativos de B); zero para A; apagar depois |
| 5.3 | API | `qa.trainer`: POST com `patientIds:[<qa.pacientea>]` | 400/404; nada criado |
| 5.4 | API | `actionUrl: "https://phish.example"` | 400 |
| 5.5 | API | `qa.admina`: POST para `qa.pacientea` | criado (regressão) |

## T-6 — Financeiro legado

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 6.1 | API | criar como `qa.admina` um treatment plan e uma membership em A; `qa.trainer`: GET/PUT/DELETE deles | 404; banco inalterado |
| 6.2 | API | `qa.trainer`: POST treatment-plans/memberships com `patientId` = `qa.pacientea` | 404 (a T-7 pode dar 403 antes; os dois são aceitos) |
| 6.3 | API | `qa.trainer`: GET `/api/admin/appointments/<appointmentA>/invoice` | 404 |
| 6.4 | API | `qa.trainer`: POST `/api/admin/patients/<qa.pacientea>/invoice` | 404; fila de aprovação sem item novo |
| 6.5 | API | `qa.trainer`: GET `/api/admin/finance/stripe` | 403; `qa.superadmin` → 200 |
| 6.6 | API | `qa.admina` cria produto de marketplace em A; `qa.trainer`: PATCH/DELETE | 404 |
| 6.7 | API | checkout de marketplace de produto pago forçando total 0 | pedido não fica `paid` |
| 6.8 | API | `qa.aluno`: subscribe numa membership de A | 404 |
| 6.9 | API | membership paga sem `stripePriceId` no tenant do paciente → subscribe | erro; nenhum `ServiceAccess` criado |
| 6.10 | UI | `qa.superadmin`/`qa.admina`: treatment plans, memberships, invoices, marketplace, finance | funcionam (regressão) |

## T-7 — Personal isolado do Stripe/clínico BPR

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 7.1 | UI | `qa.trainer`: `/admin/treatment-plans`, `/admin/memberships`, `/admin/service-pricing`, `/admin/marketplace`, `/admin/screening-preview` | redireciona |
| 7.2 | API | `qa.trainer`: `/api/admin/treatment-plans`, `/api/admin/memberships`, `/api/admin/marketplace/products`, `/api/admin/rehab-plans/recent`, `/api/admin/body-assessments`, `/api/admin/journey/ai-coach`, `/api/admin/patients/<aluno>/packages` e `/documents/generate` | 404 (gate personal); `service-prices` → 403 (T-2) |
| 7.3 | UI | `qa.trainer`: menu Finance | sem Pricing/Memberships/Marketplace |
| 7.4 | API | `qa.aluno` (cookie e Bearer): `/api/patient/treatment-plans/checkout`, `/api/patient/membership/subscribe`, `/api/patient/packages/checkout`, `/api/patient/protocol`, `/api/patient/rehab-plan`, `/api/payments/create-checkout` | 404; `GET /api/patient/membership/subscription` continua 200 |
| 7.5 | UI | `qa.aluno`: `/dashboard/membership`, `/dashboard/marketplace` | redireciona; itens fora do menu |
| 7.6 | API | `qa.aluno`: pagamento online da sessão (`create-checkout`) | recusado com mensagem "presencial" |
| 7.7 | UI | `qa.trainer`: ficha do aluno → aba Exercises | continua funcionando |
| 7.8 | UI/API | `qa.admina`/`qa.pacientea`: treatment plans, memberships, pacotes, pagamento online, screening | inalterados (regressão clínica) |

## T-8 — Catálogos por id

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 8.1 | API | `qa.trainer`: GET `rehab-plans/recent` | só de B (vazio) |
| 8.2 | API | `qa.admina` cria achievement/condition/quiz/treatment-type em A; `qa.trainer`: update/delete por id | 404; banco inalterado |
| 8.3 | API | update em item do próprio tenant com `clinicId` de A no corpo | `clinicId` inalterado |
| 8.4 | API | `qa.trainer`: GET `exercises/<exerciseA>`, `equipment/<id de A>`; `exercises/translate` com `exerciseA` | 404 / nada traduzido |
| 8.5 | UI | `qa.admina`: editar os próprios catálogos | funciona (regressão) |

## T-9 — Uploads

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 9.1 | API | `qa.trainer`: upload `x.svg`, `x.html`, `x.exe` | 400 |
| 9.2 | API | `qa.trainer`: upload `.jpg` válido | 200; arquivo acessível |
| 9.3 | API | upload acima do limite | 413/400 |
| 9.4 | API | colocar um `.svg` com `<script>` direto na pasta de uploads local; GET pela rota | `Content-Disposition: attachment`, `CSP: sandbox`, `nosniff` |
| 9.5 | UI | páginas com mídia existente (exercícios com vídeo, Instagram) | continuam carregando |

## T-10 — Itens médios

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 10.1 | Unit | lógica do checkout com assinatura INCOMPLETE existente | expira a anterior ou recusa; nunca duas abertas |
| 10.2 | Unit/API | webhook Connect assinado: `subscription.updated` `active` para assinatura CANCELLED; status `paused` | continua CANCELLED; não vira ACTIVE |
| 10.3 | Unit | cancelamento com a Stripe lançando erro | status inalterado + erro |
| 10.4 | API | `qa.trainer`: POST `notifications/trigger`; sem `CRON_SECRET` no env | 403; recusa |
| 10.5 | — | ~~anônimo: POST `/api/version/update`~~ — fora do escopo da branch (revertido; alerta para a frente de plataforma) | — |
| 10.6 | API | aluno manda mensagem `<img src=x onerror=alert(1)>` | HTML do e-mail ao staff com o texto escapado (e-mail capturado/logado, não enviado) |
| 10.7 | API | `qa.aluno`: GET challenge com leaderboard; challenge ARCHIVED | sem `studentId` de outros; ARCHIVED → 404 |
| 10.8 | API | `qa.trainer`: POST assessment com `performedAt: "abc"` | 400 |
| 10.9 | API | THERAPIST de B (criar na fixture): reembolso / `connect/onboard` | 403; ADMIN → ok |

## Regressão geral (fim da atividade)
- Crawl completo do admin do personal e do portal do aluno (script da revisão de 18/09) → nenhum 4xx/5xx novo, nenhuma página quebrada.
- Crawl do admin da clínica A e do portal do paciente A → idem.
- Fluxo principal do personal: criar treino → aluno registra série → "Session saved!".
