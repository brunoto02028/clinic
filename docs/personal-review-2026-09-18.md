# Revisão completa — personal trainer + aluno (18/09/2026)

Escopo: tudo o que um tenant `PERSONAL_TRAINER` (o personal, papel ADMIN) e o aluno dele (PATIENT) alcançam — admin web, portal web do aluno, APIs e app mobile (código). Base: commit `6e66130`.

## Como foi feito

| Frente | Método | Cobertura |
|---|---|---|
| Admin do personal (web) | Crawl Playwright logado como `qa.trainer` (tenant `qa-studio-pt`, dev local) — 39 rotas, screenshot + console + respostas ≥400 + varredura de vocabulário clínico/BPR | todas as abas do menu + rotas escondidas acessíveis por URL |
| Portal do aluno (web) | Crawl logado como `qa.aluno` — 28 rotas, desktop e mobile (390px) | menu completo + rotas bloqueadas |
| Fluxo principal | Manual: personal cria treino → aluno abre, registra série e finaliza | ✅ funcionou ponta a ponta ("Session saved!", histórico 1) |
| Segurança das APIs | Leitura de código (auth → query) de todas as rotas do personal/aluno + rotas legadas compartilhadas; críticos **confirmados ao vivo** no dev local | módulos novos + legado compartilhado |
| App mobile (aluno) | Leitura de código dos dois lados (app ↔ API) | treino, avaliações, nutrição, login/registro |
| Produção | Só leitura: contagens no banco e versão | nenhuma escrita em prod |

**Não exercitado ponta a ponta nesta rodada** (já tinham QA próprio nas ativ. 27/29/33, e as APIs saíram limpas na auditoria): criar/atribuir Program Template, criar plano alimentar, registrar avaliação, criar challenge, aba Billing (Stripe Connect segue desligado).

## Resumo

- **O núcleo do produto do personal está sólido.** Treinos, programas, nutrição, avaliações, challenges, badges e cobrança via Connect estão bem isolados por tenant e por aluno. O fluxo treino → registro funciona.
- **O problema está no que o personal herdou da clínica.** São rotas e telas legadas compartilhadas que:
  - checam só o papel, sem olhar o tenant;
  - gravam em configuração **global da BPR**;
  - ou nem checam o papel, e aí um **aluno/paciente logado** alcança `/api/admin/*`.
- **Exposição hoje em prod:** 1 clínica (BPR) + 1 personal de teste (`bruno`, 0 alunos), nenhum staff externo.
  - As falhas que exigem conta de personal/ADMIN ainda **não têm quem as explore**, mas passam a ter no dia em que o primeiro personal externo (Emanuel) receber conta.
  - As alcançáveis por **qualquer paciente logado** (C1, C3, C4, A5, A6) estão expostas **agora**.

---

## 1. Segurança (prioridade máxima)

✔ = confirmado ao vivo no dev local · 📖 = confirmado lendo o código

### Crítico

| # | Onde | Problema | Quem explora |
|---|---|---|---|
| S1 ✔ | `app/api/settings/route.ts:101` | `PUT` aceita qualquer ADMIN/THERAPIST de **qualquer** tenant e grava no `SiteSettings` único, ou seja, o **site público da BPR**: nome, hero, termos, SEO, logos e `notificationEmail`. A tela `/admin/settings` aparece no menu do personal, preenchida com os dados da BPR. | personal |
| S2 📖 | `app/api/admin/consent-texts/route.ts:107`, `app/api/patient-portal-config/route.ts:283` | Mesma linha global: o personal troca os **textos de consentimento** e a **config do portal** de todos os pacientes da BPR. | personal |
| S3 ✔ | `app/api/appointments/[id]/route.ts:99-118` | `PATCH` sem dono e sem tenant. O **aluno muda o preço da própria sessão** (confirmado: £60 → £0,30) e a data. Staff de outro tenant lê a sessão, com a nota SOAP, e altera ou apaga. | aluno/paciente, personal |
| S4 📖 | `app/api/admin/patient-tasks/route.ts:22-30,77-82` | `GET` sem filtro de tenant. `POST audience:"all"` manda tarefa (e-mail/WhatsApp/push com link) para **todos os pacientes da plataforma**. É a mesma classe do incidente de broadcast de 11/09. | personal |
| S5 ✔ | `app/api/admin/finance/stripe/route.ts:10-27,171-185` | Só pede sessão, sem papel. Um **aluno logado lê o saldo Stripe da BPR e as últimas cobranças, com e-mail do cliente** (confirmado: aluno → 200). | aluno/paciente |
| S6 ✔ | `app/api/admin/marketplace/products/route.ts` (GET/POST/PATCH/DELETE) | Só pede sessão. Um aluno põe preço 0 num produto da loja BPR, e o checkout marca o pedido como `paid` (confirmado: aluno → 200 no GET). | aluno/paciente |

### Alto

| # | Onde | Problema |
|---|---|---|
| S7 | treatment-plans, memberships, `payments/create-checkout`, `admin/appointments` (`paymentMode:"online"`) | **O pagamento do aluno do personal cai na conta Stripe da BPR**, não no Connect do personal. Memberships fica no menu Finance do personal, e `/dashboard/membership` não é bloqueada. Além disso, `POST /api/appointments` confia no `price` que vem do cliente. |
| S8 | `treatment-plans/[id]`, `memberships/[id]`, `admin/appointments` POST, `appointments/[id]/invoice`, `patients/[id]/invoice` | Editáveis ou legíveis entre tenants pelo id. A invoice devolve dados pessoais do paciente e os dados bancários da BPR. |
| S9 | `app/api/admin/rehab-plans/recent/route.ts` | Sem tenant: o personal lê os últimos rehab plans da plataforma (queixa, região, gravidade). |
| S10 ✔ | `app/api/admin/finance/route.ts` (+ `categories`, `api-keys`, `ocr`) | Só pede sessão: o **aluno lê o livro financeiro do personal** (confirmado: aluno → 200), pode editar lançamentos e criar API key. |
| S11 | `app/api/admin/social/upload/route.ts` + `app/api/uploads/[...path]` | Qualquer sessão sobe arquivo de qualquer extensão. Um `.svg` com script é servido na mesma origem, o que é **XSS armazenado → escalada para admin**. |
| S12 | `service-prices`, `service-packages`, `patient-packages`, `service-access`, `articles`, `stripe-branding` | Tabelas e config globais graváveis pelo personal: preço da consulta da BPR, pacotes, conceder acesso pago a qualquer paciente, artigos do blog (com disparo para a newsletter) e perfil da conta Stripe da BPR. |

### Médio / baixo (resumo)
- **Assinatura grátis de plano de outro tenant:** `membership/subscribe` não checa tenant e ativa em "modo manual" se o plano não tem preço Stripe.
- **Assinatura duplicada:** `billing/checkout` não expira a sessão anterior, então duas abas geram duas assinaturas e uma fica órfã, cobrando.
- **Webhook Connect:** um evento atrasado pode reativar uma assinatura cancelada. Status não mapeado vira ACTIVE. O cancelamento marca CANCELLED mesmo quando a Stripe falhou.
- **Catálogos editáveis entre tenants pelo id:** achievements, conditions, quizzes, journey, treatment-types, marketplace orders.
- **Varredura de notificações:** `notifications/trigger` dispara a varredura da plataforma inteira. `CRON_SECRET` tem default `"bpr-cron-secret"` (conferir o env de prod).
- **Recarga forçada:** `version/update` não tem auth nenhuma, então um anônimo força reload em todos os clientes.
- **E-mail ao staff:** a mensagem do aluno entra sem escape no HTML.
- **Leaderboard:** o do challenge expõe o `studentId` de outros alunos.

### Causa-raiz e correção estrutural sugerida
1. **Middleware:** negar `PATIENT` em `/api/admin/*` (hoje só `/admin/*` é negado). Fecha S5, S6, S10, S11 e parte de S12 de uma vez. Antes, é preciso levantar se alguma rota `/api/admin/*` é usada legitimamente pelo aluno.
2. **Config global:** as escritas em `SiteSettings`, `consent-texts`, `patient-portal-config`, preços globais, artigos e `stripe-branding` passam a ser **só SUPERADMIN**. O que o personal precisa editar (logo, cores, nome) já está em `Clinic`.
3. **Rotas por id:** migrar para `getActor`/`staffPatientAccess` com filtro por `clinicId`, o mesmo padrão das ativ. 46/47.
4. **Rotas clínicas e Stripe-BPR:** entram em `personal-blocked-routes` (treatment-plans, memberships, packages, rehab-plans, screening, body-assessments, `create-checkout`).

---

## 2. Produto / UX do personal (admin)

| # | Achado | Impacto |
|---|---|---|
| P1 | **Biblioteca de exercícios começa vazia.** O personal novo não tem nenhum exercício, e o **gerador de treino com IA falha** ("Add exercises with video to your library first") até ele subir exercícios com vídeo. A BPR tem 215 com vídeo em prod. | **Bloqueia o 1º uso**: o Emanuel não conseguiria usar a IA no dia 1 |
| P2 | O menu **Settings** mostra telas de plataforma: General (site BPR), **Studios** ("Manage all clinics…", com botão "Add Clinic" e API dando 401), AI (401), Security, Logs (401). | Confuso, e ligado a S1 |
| P3 | O menu **Finance → Pricing** mostra os serviços clínicos da BPR (Consultation £100, Treatment Session, Foot Scan, Body Assessment, "Patient Access Override"). **Memberships** usa o Stripe da BPR (S7). | Vazamento clínico + dinheiro na conta errada |
| P4 | A ficha do aluno tem duas formas paralelas de passar exercício: a aba **Exercises** (prescrição clínica, que alimenta a "Adherence") e a aba **Workouts** (builder do personal). | Confuso; a adesão ignora os Workouts |
| P5 | O **onboarding do aluno** lista o passo "Submit medical screening", que é **rota bloqueada** para personal. O "Send now" mandaria o aluno para uma página que não abre. | Bug funcional |
| P6 | Vocabulário clínico que escapou: Waitlist ("Patients waiting…"), Availability ("Patients won't see…"), Achievements ("patient gamification"), Quizzes, Portal ("patient sidebar"), Video consultations, Calls ("BPR AI voice assistant"), Journey ("BPR Journey Control Centre"). | Polimento |
| P7 | Com o estúdio ainda sem logo, a barra lateral mostra a **logo da BPR**. O ícone de "Training"/"Studio" é um estetoscópio. "Trainers: 0" no painel, mesmo com o próprio personal ativo. "View Website" leva ao site da BPR. | Polimento |
| P8 | Na busca da biblioteca dentro do builder, aparece **"No matches." antes de buscar**: a busca só roda com Enter ou clique na lupa. | Parece que a biblioteca está vazia |
| P9 | A IA pede confirmação "This replaces the current name and exercises…" mesmo com o treino vazio. | Polimento |
| P10 | Rotas clínicas escondidas no menu, mas abertas por URL: `/admin/treatment-plans` (500 no stripe-branding), `/admin/screening-preview`, `/admin/equipment` (texto do Atlas/SOAP), `/admin/treatment-types`. | Ligado a S7/S9 |

## 3. Produto / UX do aluno (portal web)

| # | Achado | Impacto |
|---|---|---|
| A1 | **Sessões, Exercises e Learn vêm travados por paywall** ("Upgrade your plan… From £0.90/month"). O preço é **texto fixo** (`lib/i18n.ts:1052`), e a página de planos diz "No plans available". Por padrão o aluno **não consegue agendar com o personal**. | **Bloqueia o uso** |
| A2 | O item **Exercises** do menu aponta para `/dashboard/treatment`, que é bloqueada para personal, e redireciona para a home. | Link morto |
| A3 | **Termos & Consentimento** são os termos clínicos da BPR ("Bruno Physical Rehabilitation clinical platform", "Informed Consent for Treatment"). O aluno do personal aceita termos de tratamento de fisioterapia. | **Jurídico**: decidir antes do 1º aluno real |
| A4 | **"How It Works"** (`/dashboard/guide`) é o guia clínico da BPR: "Welcome to BPR", triagem médica, terapeuta, Clinical Notes. | Vazamento clínico |
| A5 | Vocabulário: Messages ("Clinic Messages — Communications from your therapist"), Profile ("your therapist… treatment"), Tasks ("requested by your clinic"). No menu também aparecem Journey ("BPR Journey… rehabilitation"), Marketplace ("rehabilitation products, insoles") e Community ("other patients"). | Polimento |
| A6 | O `<title>` de quase todas as páginas do aluno e do login do estúdio é **"Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond"**. | Marca errada na aba do navegador |
| A7 | A logo da barra lateral do aluno aparece quebrada (ícone minúsculo). Os rótulos dos itens travados saem cortados ("S", "E", "L"). | Visual |
| A8 | "Hoje" em UTC na nutrição e no destaque de treino: entre 21h e 0h (Brasília), o jantar marcado cai no dia seguinte e o treino de amanhã aparece como "Today". Vale para web e app. | Bug de dados para usuário no Brasil |

## 4. App mobile do aluno (não publicado; EAS pendente)

Contratos de API: **sem divergência** nos 8 endpoints que o aluno usa.

| # | Achado |
|---|---|
| M1 | Treino, Avaliações e Nutrição são `Stack` sem abas e sem perfil. Quem entra num módulo **não chega aos outros nem consegue sair da conta** sem fechar o app. |
| M2 | O registro com "código do profissional" em branco cai no tenant BPR. O aluno vira paciente da clínica, e depois dá 409 ao tentar de novo com o código. |
| M3 | Um peso com vírgula ("22,5", teclado pt-BR no iPhone) vira `null` e salva como "Saved ✓" sem carga. O RPE tem o mesmo problema. |
| M4 | O app descarta `clinicType`, logo e cor do tenant, então mostra só a marca BA One. **Login com a marca do personal não existe no código** (corrige a nota antiga de que a ativ. 21 teria entregado isso). |
| M5 | O app é todo em inglês; o botão "Português" é decorativo. A URL padrão da API é `https://bpr.rehab` (domínio aposentado) e o `eas.json` não a sobrescreve. **Precisa virar bpr.clinic antes do build.** |
| M6 | Não há pull-to-refresh: treino ou plano novo do personal só aparece matando o app. O seletor de módulos não mostra nada quando a lista vem vazia ou falha. |
| M7 | Paridade com o web: faltam sessões/agendamento, pagamentos, challenges, mensagens, home e perfil. No treino faltam o histórico detalhado e o timer. |

---

## 5. Ordem sugerida de correção

1. **Segurança — antes de qualquer personal externo em prod** (S1–S12 + causa-raiz). Parte dela (S3, S5, S6, S10, S11) já é alcançável por pacientes reais da BPR hoje.
2. **Destravar o 1º uso do personal:**
   - P1: biblioteca inicial;
   - A1: paywall/sessões do aluno;
   - A2: link morto;
   - P5: passo de triagem;
   - A3: termos do aluno (decisão de conteúdo).
3. **Limpeza de marca e vocabulário:** P2, P3, P6, P7, A4–A7, e P4 (unificar exercícios × treinos).
4. **App mobile** antes do build EAS: M1, M2, M3, M5 obrigatórios; M4, M6 e M7 desejáveis.
5. **Bugs de fuso** (A8) e itens médios/baixos de segurança.
