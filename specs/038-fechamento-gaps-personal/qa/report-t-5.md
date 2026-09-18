# QA Report — T-5: QA de Planos/Mensalidade no contexto do personal trainer

**Data:** 2026-09-13
**Resultado geral:** ⚠️ aprovado com ressalvas

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 17 | Criar plano como personal, sem vocabulário clínico | UI | ✅ (após correção) |
| 18 | Aluno assina o plano, sem vocabulário clínico | UI | ✅ (após correção) |
| 19 | Nenhuma cobrança real durante o QA | API | ✅ |
| — (derivado do Passo 3 da tarefa) | Checkout resolve a conta Stripe certa pro tenant personal | Code review | ⚠️ ressalva — ver "Achado importante" |

## Ambiente
- Servidor dev: `http://localhost:4000` (precisou de restart no meio do QA — ver "Observação de ambiente").
- Tenant: `QA Studio PT` (`PERSONAL_TRAINER`), fixture já existente via `scripts/qa/tenant-fixtures.cjs` (idempotente, reaproveitado — não é lixo de teste).
- Login trainer: `qa.trainer@example.test` (role ADMIN) via `/staff-login`.
- Login aluno: `qa.aluno@example.test` (role PATIENT) via `/login`.
- `STRIPE_SECRET_KEY` comentado/ausente no `.env` local — esse é o próprio guard: nenhuma chamada real à API da Stripe é sequer possível neste ambiente.

## Detalhes

### 17. Criar plano como personal, sem vocabulário clínico — ✅ (após correção)
- **Passos:** login como `qa.trainer@example.test`, `/admin/memberships` → "New Membership" → preencher nome/descrição → "Select All" nos módulos → "All Students" → "Create Membership".
- **Antes da correção:** a tela e o diálogo de criação não chamavam `useVocab()`/`relabel()` em nenhum momento — nem a página nem o modal de preview. Mais de 15 ocorrências de vocabulário clínico numa única tela ("patients", "Specific Patient"/"All Patients", categoria "Clinical", "Treatment Plan", "Clinical Notes", "Chat with Therapist", "rehabilitation", etc.).
- **Depois da correção:** mesma tela, mesmo fluxo — nenhuma ocorrência de `Patient(s)/Clinic(al)/Therapist/Treatment/Rehabilitation/Physiotherapy` (verificado por regex sobre `document.body.innerText`, resultado vazio). Textos viram "give students access", "Specific Student"/"All Students"/"No Student (Draft)", categoria "Training", "Sessions", "Workout Plan", "Training Notes", "Chat with Trainer", "Book In-Person Sessions", "training journey", "training products", "requested by your studio".
  - Plano de teste criado com sucesso ("QA Test Plan T5", £9.90/mês, 20 módulos + 11 permissões, escopo "All Students") e depois removido.
- **Evidência:** `specs/038-fechamento-gaps-personal/qa/screenshots/t-5-admin-create-plan-vocab.png`
- **Console do browser:** sem erros JS relacionados à mudança (só o 500 esperado de `/api/admin/stripe-branding`, por falta de `STRIPE_SECRET_KEY` local — ambiente, não bug).

### 18. Aluno assina o plano, sem vocabulário clínico — ✅ (após correção)
- **Passos:** login como `qa.aluno@example.test`, `/dashboard/membership`.
- **Antes:** estado "sem planos" dizia "...once your clinic sets them up"; `getFeatureLabel()` retornava `mod.label`/`perm.label` crus, sem `relabel()`.
- **Depois:** assinei o plano de teste como aluno e a lista completa "What's included" (30 itens) veio 100% relabeled: "Workout Plan", "My Records", "Training Notes", "Chat with Trainer", "Book In-Person Sessions", "BPR Journey", etc. Nenhuma ocorrência de vocabulário clínico. Estado vazio agora mostra "...once your studio sets them up."
- **Evidência:** `t-5-student-membership-list-vocab.png`, `t-5-student-subscribed-vocab.png`.
- **Console do browser:** 0 erros, 0 warnings após assinar.
- **Ressalva menor (não corrigida, fora do escopo):** em PT, "quando a estúdio configurá-los" ficou com concordância de gênero errada (deveria ser "o estúdio"). Limite pré-existente de `personalizeLabel()` em `lib/tenant-vocab.ts` (não trata gênero em PT), já usado assim em outras telas — não introduzido por esta correção.
- **Ressalva menor 2 (fora do escopo, achado incidental):** `components/memberships/MembershipPreviewModal.tsx` tem um array `FEATURES` local com chaves que não batem com as chaves reais salvas em `MembershipPlan.features` (`mod_*`/`perm_*`) — a seção "What's included" do preview de checkout sempre aparece vazia. Bug pré-existente, não relacionado a vocabulário.

### 19. Nenhuma cobrança real durante o QA — ✅
- `POST /api/patient/membership/subscribe` ativou a assinatura imediatamente (sem `checkoutUrl`), caindo no branch `if (!plan.stripePriceId || !process.env.STRIPE_SECRET_KEY)` — nenhuma chamada à Stripe é feita.
- Confirmado via `browser_network_requests`: nenhuma requisição saiu pra `api.stripe.com`/`checkout.stripe.com`.
- Confirmado via banco: `PatientSubscription.stripeSubscriptionId = null`, `stripeCustomerId = null`.

## Achado importante (informativo, já antecipado no Passo 3 da tarefa)
`MembershipPlan`/`PatientSubscription` usa sempre a conta Stripe global única da BPR (`lib/stripe.ts`) — não há resolução por `Clinic.stripeAccountId` em lugar nenhum desse fluxo, nem para tenants `PERSONAL_TRAINER`. **Isso é esperado e por design, não uma regressão**: o `plan.md` da atividade 28 documenta explicitamente que `MembershipPlan`/`PatientSubscription` é a "espinha BPR" que fica intacta de propósito, e cria um sistema separado (`BillingPlan`/`BillingSubscription` + `lib/connect.ts` + `stripeFor(clinicId)`) especificamente para a cobrança do personal via Stripe Connect — já "código pronto (aguarda QA test-mode)" segundo aquele plano. Se um personal trainer criar um `MembershipPlan` pago hoje, o dinheiro iria pra conta da BPR — comportamento intencional do sistema atual (MembershipPlan = acesso a módulos da plataforma; cobrança do próprio personal = feature separada da atividade 28). Nenhuma mudança de código feita aqui.

## Correções de código
Vazamento de vocabulário clínico corrigido (autorizado pelo Passo 4 da tarefa), reaproveitando `useVocab()`/`relabel()` (mesmo padrão já usado em `app/admin/patients/[id]/permissions/page.tsx`). Nenhuma dependência nova, nenhuma mudança de schema/API/lógica de negócio.

- **`app/admin/memberships/page.tsx`**: import de `useVocab`/`useLocale`, helper `rlabel(en, pt)`; `relabel()` aplicado no cabeçalho, estado vazio, toast de erro, chips de feature, placeholder do prompt de IA, labels "Specific Patient"/"All Patients"/"No Patient (Draft)", placeholder do select, texto de ajuda, categorias/labels/descriptions do checklist de Módulos & Permissões.
- **`app/dashboard/membership/page.tsx`**: import de `useVocab`, helper `rlabel`; `getFeatureLabel()` agora relabeled; texto do estado "Nenhum plano disponível" (EN/PT) passa por `relabel()`.
- **`components/memberships/MembershipPreviewModal.tsx`**: import de `useVocab`; string "How the patient sees the subscription payment page" relabeled.

Não tocado (fora do escopo): "Patient"/"patientId"/"patientScope" como nomes de campo/tipo interno e contrato de API — não são texto visível ao usuário.

## Erros de console
Nenhum erro JS novo introduzido pela correção. Único erro observado (`500` em `GET /api/admin/stripe-branding`) é por `STRIPE_SECRET_KEY` ausente no `.env` local — comportamento de ambiente, já tratado com fallback silencioso pela UI.

## Observação de ambiente
Bateu no bug de cache/HMR obsoleto do Next dev + Playwright já documentado na memória do projeto (`bug-cache-playwright-nextjs-dev.md`) — resolvido desabilitando o cache HTTP da sessão via CDP. Não é bug da atividade 38.

## Limpeza
Deletados após os testes: `MembershipPlan` "QA Test Plan T5", `PatientSubscription` correspondente, `ServiceAccess` (CONSULTATION) criado como efeito colateral. Confirmado 0 remanescentes para o tenant `QA Studio PT`. Fixtures reutilizáveis (`QA Studio PT`/`QA Clinic A` e usuários) preservados — não são lixo desta tarefa. Dev server reiniciado e saudável.

## Falhas e recomendações
Nenhuma falha bloqueante. Recomendações (fora do escopo da T-5, não acionadas):
1. Decidir se `MembershipPlan` do tenant personal deveria rotear pela conta Connect do personal — se sim, entra como tarefa nova dependente da atividade 28.
2. `MembershipPreviewModal.tsx`: lista `FEATURES` desatualizada, preview de checkout sempre vazio — bug pré-existente, vale uma tarefa de limpeza separada.
3. Erro de tipo pré-existente em `handleAiGenerate` (`app/admin/memberships/page.tsx`, falta `sessionDiscount`) — confirmado via `git stash` que já existia antes desta sessão, não é regressão.
4. Ressalva de gramática PT em `personalizeLabel()` — baixa prioridade.

---

## Code review — correções

O code review achou um bug real na própria correção de vocabulário: `relabel()` (de `useVocab()`) escolhe o conjunto de regex (EN ou PT) pelo **locale da sessão**, não pelo idioma real do texto passado. `app/admin/memberships/page.tsx` e `components/memberships/MembershipPreviewModal.tsx` têm textos próprios **sempre em inglês** (nunca traduzidos pro PT) — então numa sessão com locale pt-BR, `relabel("...patients...")` aplicava o conjunto de regex PT contra texto em inglês, e a palavra "patients" não era substituída (o vazamento de vocabulário continuava, só que agora silenciosamente, sem nenhum aviso).

1. **Corrigido — `app/admin/memberships/page.tsx`.** Adicionado `relabelEn(text)` (chama `personalizeLabel(text, { isPersonal, isPt: false })` diretamente, ignorando o locale da sessão) e trocado todo `relabel("...")` sobre string em inglês fixo por `relabelEn(...)` — cabeçalho, estado vazio, toast de erro, chips, placeholder do prompt de IA, labels "Specific Patient"/"All Patients"/"No Patient (Draft)", placeholder do select, texto de ajuda. As chamadas `rlabel(mod.label, mod.labelPt)` (que já escolhem o idioma certo ANTES de chamar `relabel()`) não precisaram de mudança — já estavam corretas.
2. **Corrigido — `components/memberships/MembershipPreviewModal.tsx`, achado extra do review: labels do array `FEATURES` nunca passavam por `relabel()` em nenhum momento** (a correção original só tocou a string "How the patient sees..."). Corrigido junto com o mesmo problema de locale: `relabel` agora é definido localmente com `isPt: false` forçado (o componente também é sempre em inglês), e `f.label` no render da lista "What's included" agora passa por `relabel()`.
3. `app/dashboard/membership/page.tsx` **não precisou de correção** — essa página já escolhe o texto certo por locale ANTES de chamar `relabel()` (`relabel(isPt ? "..." : "...")`), então o `isPt` do `useVocab()` já bate com o idioma do texto passado.

**Verificação:** script `tsx` descartável reproduzindo o bug (`personalizeLabel(text, { isPersonal: true, isPt: true })` contra o texto em inglês → "patients" não muda) e confirmando o fix (`isPt: false` forçado → "give students access...", "Workout Program Access").

**Não corrigido, avaliado e descartado:** duplicação do helper `rlabel(en, pt)` em 3 arquivos (`admin/memberships`, `dashboard/membership`, `admin/patients/[id]/permissions`) — observação de manutenibilidade válida, mesma classe de achado "não repriorizado nesta atividade" já aceita nas rodadas de review anteriores (T-1 a T-4).
