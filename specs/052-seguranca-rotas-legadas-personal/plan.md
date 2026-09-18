# Atividade 52 — Segurança das rotas legadas antes do 1º personal externo

## Objetivo

Fechar as falhas de segurança achadas na revisão de 18/09/2026 (`docs/personal-review-2026-09-18.md`, seção 1) **antes** de provisionar o primeiro personal de fora (Emanuel) em produção.

Os módulos novos do personal (treino, programas, nutrição, avaliações, challenges, badges, Connect) saíram limpos. O problema está nas rotas **legadas compartilhadas com a clínica**:

1. **Config global:** gravam na configuração global da BPR (site, termos, preços, artigos, Stripe) aceitando qualquer ADMIN/THERAPIST, de qualquer tenant.
2. **Busca só por id:** acham registros pelo id sem checar o tenant.
3. **Sem checagem de papel:** um aluno/paciente logado alcança `/api/admin/*`, porque o middleware só nega PATIENT em `/admin/*`.

Parte disso é explorável **hoje** em prod por qualquer paciente logado da BPR:
- S3: o aluno muda o preço da própria sessão (confirmado ao vivo, £60 → £0,30);
- S5: o aluno lê o saldo e as cobranças Stripe da BPR;
- S6: o aluno edita produtos da loja;
- S10: o aluno lê o livro financeiro;
- S11: upload de SVG vira XSS.

## Decisões de design

- **D1 — Correção estrutural primeiro (T-1).** O middleware passa a negar `PATIENT` em `/api/admin/*` com 403 JSON. Isso fecha de uma vez S5, S6, S10 e o lado do aluno de S11/S12, e protege rotas futuras que esqueçam o papel. As rotas `/api/admin/*` que o aluno usa de verdade entram numa allowlist explícita e curta (levantamento na T-1). Hoje só se conhece `GET /api/admin/consent-texts` (tela `/dashboard/consent`).
- **D2 — Configuração global = só SUPERADMIN (T-2).** Toda escrita na linha única de `SiteSettings` (site, consentimento, config do portal), em preços/pacotes globais (`clinicId: null`), artigos e perfil da conta Stripe da plataforma passa a exigir SUPERADMIN. Em prod hoje só existem 2 SUPERADMIN (BPR) e 1 ADMIN (personal de teste), então ninguém da BPR perde acesso.
- **D3 — O personal ganha a marca dele (T-3).** Hoje o passo "Personalise your studio" do getting-started manda para `/admin/settings`, que grava o site da BPR. Não existe tela para o personal editar a marca do próprio estúdio. A T-3 cria essa tela, gravando nos campos que já existem em `Clinic` (`name`, `logoUrl`/`logoPath`, `primaryColor`, `secondaryColor`), só no tenant de quem chama. T-2 e T-3 vão juntas para prod, senão o personal perde o único caminho de marca.
- **D4 — Rotas por id seguem o padrão das ativ. 46/47.** `getActor` / `getSessionStaffActor` / `staffPatientAccess` com `clinicId` no `where`. SUPERADMIN continua vendo tudo. Nada de `session.user.clinicId` direto nem `?clinicId=` aceito de não-SUPERADMIN.
- **D5 — O personal não encosta no Stripe da BPR (T-7).** Treatment plans, memberships, pacotes e pagamento online de sessão usam a conta Stripe global da BPR. Para o tenant personal eles entram em `personal-blocked-routes` (página e API) e saem do menu (Finance → Pricing/Memberships/Marketplace). O dinheiro do aluno do personal só passa pelo Connect (ativ. 28). Até o Connect cobrir sessões avulsas, sessão de personal é paga presencialmente (opção da ativ. 50).
- **D6 — Preço de sessão calculado no servidor (T-4).** `POST /api/appointments` deixa de confiar no `price` do cliente, e `PATCH /api/appointments/[id]` não aceita `price`/`dateTime` do aluno (remarcar continua pelo `/reschedule`, que já é correto).
- **D7 — Deploy incremental.** Como T-1 e T-4 fecham falhas já expostas em prod, cada uma pode ir para prod assim que passar em QA + review, sem esperar o resto (commit/push só com sua autorização, como sempre).
- **D8 — QA sem envio real.** O servidor de QA roda com `RESEND_API_KEY` vazio e sem WhatsApp configurado. Os cenários de "envio em massa" (T-5) verificam **destinatários calculados** (resposta/banco), nunca um envio de verdade. Regra do projeto: nada é enviado a paciente/aluno sem um clique manual.

## Tarefas

| T-N | Nome | Achados | Status |
|-----|------|---------|--------|
| T-1 | Middleware: aluno/paciente fora de `/api/admin/*` (+ allowlist) | S5, S6, S10, lado aluno de S11/S12 | pendente |
| T-2 | Configuração global da BPR só para SUPERADMIN (+ abas de plataforma escondidas) | S1, S2, S12, P2 | pendente |
| T-3 | Marca do estúdio editável pelo próprio personal | consequência de T-2 | pendente |
| T-4 | Agendamentos: tenant + dono no `[id]`, preço no servidor, `patientId` do tenant | S3, parte de S7/S8 | pendente |
| T-5 | Tarefas em massa (`patient-tasks`) presas à clínica de quem chama | S4 | pendente |
| T-6 | Financeiro legado: treatment-plans, memberships, invoices, marketplace, finance | S7, S8, S10, M1 | pendente |
| T-7 | Personal isolado do Stripe e das rotas clínicas da BPR (bloqueio + menu) | S7, S9, P3, P10 | pendente |
| T-8 | Catálogos e listas por id presos ao tenant | S9, M3 | pendente |
| T-9 | Uploads: extensão/tamanho permitidos e SVG/HTML nunca inline | S11 | pendente |
| T-10 | Itens médios: checkout duplicado, webhook Connect, trigger/version, escapes | M2, M4, M5, baixos | pendente |

Ordem sugerida: T-1 → T-4 (expostos hoje) → T-2 + T-3 (juntas) → T-5 → T-6 → T-7 → T-8 → T-9 → T-10.

## Fora de escopo (vão para outras atividades)

- UX e vocabulário do personal/aluno: paywall de sessões, termos clínicos, guia BPR, biblioteca inicial, exercícios × treinos. Ficam na **atividade "destravar o 1º uso do personal"**, que depende das suas 3 decisões pendentes.
- App mobile (M1–M7 da revisão).
- Centro de custos de IA → Atividade 53.

## Suposições (peço validação)

1. **T-1:** o bloqueio vale só para `role === PATIENT`. Staff impersonando um aluno continua com o papel de staff no JWT, então o bloqueio não o afeta, igual a hoje em `middleware.ts:389`.
2. **T-2:** um ADMIN da clínica BPR (se um dia existir) também perde a edição do site. Editar o site da BPR vira coisa de SUPERADMIN. Se quiser delegar isso a um funcionário, ele precisa ser SUPERADMIN.
3. **T-3:** o personal edita nome, logo e as duas cores. O **slug não é editável**: os links `/studio/<slug>` e `/join/<slug>` já podem ter sido compartilhados.
4. **T-4:** o preço da sessão vem do mesmo lugar que a tela de agendamento usa para mostrar o valor (preço do serviço/tipo da clínica). O `price` mandado pelo cliente é ignorado. Staff continua podendo ajustar o preço pela ficha (rota admin).
5. **T-7:** fica bloqueado para o personal (página + API):
   - treatment plans, memberships, pacotes e o checkout online de sessão;
   - rotas clínicas: rehab plans, triagem médica, body assessments clínicos, notas geradas por IA, relatório/documentos clínicos gerados, `journey/ai-coach`, `patient/protocol`, `patient/rehab-plan`.
   - `exercise-prescriptions` **não** é bloqueada: a aba "Exercises" da ficha do aluno usa essa rota. A decisão de unificar Exercises × Workouts fica para a atividade de 1º uso.
6. **T-10:** a assinatura órfã (duas abas de checkout) é resolvida expirando a sessão anterior e recusando checkout novo quando já existe assinatura INCOMPLETE/ACTIVE/PAST_DUE. Não mexo em quem já pagou em duplicidade (não há ninguém em prod).
