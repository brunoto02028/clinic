# Auditoria Everfit (produto real, logado) — 12/09/2026

Levantamento feito navegando de verdade dentro de `app.everfit.io` (conta trial do Bruno), não só no site de marketing. Screenshots em `docs/assets/everfit-audit-2026-09-12/`. Objetivo: mapear a estrutura real do produto pra priorizar os próximos gaps do nosso sistema (clínica + personal trainer).

## Estrutura de navegação observada

Nav principal (ícones à esquerda): Clients · **Library** · Inbox · Booking · **Automation** · **On-demand** · **Community** · Payment.

### Library
`Exercises (2520) → Workouts → Sections → Programs → Tasks → Forms & Questionnaires → Meal Plan Templates → Recipes → Ingredients → Recipe Books (NEW) → Metric Groups`

### Booking (marcado "NEW" no produto deles também — feature recente)
`Calendar → Session Types → Availability → Booking Activities`

### On-demand
`Resource Collections → Resources → Workout Collections → On-demand Workouts → Workout Labels → Video Storage (NEW) → On-demand Programs → Settings`

### Automation
`Onboarding Flow → Autoflow`

### Payment
`Packages → Sequences`

## Achados por área

### 1. Exercise Library
- 2520 exercícios prontos (biblioteca própria deles), com vídeo, tags de Modality/Muscle Group/Movement Pattern/Category.
- "Add New Exercise" permite upload de vídeo+imagem, métricas de tracking customizadas, compartilhar com o time.
- Print: `everfit-exercise-library.png`

### 2. Programs (o maior gap estrutural)
Não é "um treino por vez": é um **calendário multi-semana** com:
- `Master Planner`, `Assign Program` (atribui a N clientes de uma vez), toggle **"Enable Live Sync"** (edições no template propagam pros clientes já atribuídos), visualização 1/2/4 semanas.
- Cada dia é um card com exercícios/séries/reps, navegável semana a semana ("Week 1-2 of 4").
- Prints: `everfit-programs.png` (lista), `everfit-program-detail.png` (grid de 2 semanas aberto).

**Isso é o Activity mais valioso a considerar**: hoje nosso `WorkoutBuilder` é 1 treino avulso por aluno/dia. Programs = template multi-semana reutilizável, atribuível em massa, com sync de edição.

### 3. AI Workout Builder (compara direto com nossa Activity 32)
Botão "Everfit AI" dentro do Workout Library abre um painel split:
- Aba **AI Assistant** vs. **Standard Builder**.
- **"Drag & drop or upload a PDF, or enter the text of a single workout to instantly convert it into an Everfit workout"** — ou seja, além de gerar por prompt (que é o que fizemos), eles digitalizam treinos existentes em PDF/texto livre. Tem "Try an example" e "Generate".
- Preview ao vivo lado a lado, editável (Standard Builder) antes de salvar.
- Print: `everfit-ai-workout.png`.

**Gap adicional que não tínhamos mapeado**: import de PDF/texto de treino já existente (migração de planilha/PDF do trainer), não só geração do zero.

Também vale notar os recursos do Workout Builder padrão deles (não-IA), que talvez a gente não tenha:
- Supersets, exercícios alternativos, treino por **% de 1RM**, seções AMRAP/Timed/Interval, seções "Freestyle" (vídeo/áudio/PDF/texto livre dentro do treino).
- Print: `everfit-workout-library.png`.

### 4. Meal Plan Templates / Nutrição
- O template/receita a nível de Library é **add-on pago** separado (tela mostrou "START MEAL PLAN TRIAL") — print `everfit-mealplan2.png`.
- Estrutura da Library confirma: Meal Plan Templates → Recipes → Ingredients → Recipe Books (NEW).
- **CORREÇÃO** (achado ao entrar no perfil de um cliente, não visível a nível de Library): existe sim um botão **"Generate Meals AI"** dentro do Meal Plan do cliente — *"Instantly generate personalized meal plans tailored to your client's macro goals and dietary preferences"* — também atrás do mesmo paywall ("Unlock Custom Meal Plans" / "START MEAL PLAN TRIAL"). Print: `everfit-generate-meals.png`.
- Ou seja: **IA de nutrição por geração-a-partir-de-metas-de-macro já existe no Everfit** (paga). O que **não vimos em lugar nenhum** foi IA a partir de **foto do prato** (o nosso conceito de "MacroSnap", ainda em backlog da ativ.31) — isso continua sendo um diferencial potencial nosso, não a geração por IA em si.
- **Food Journal** (aba no perfil do cliente, distinta de Meal Plan): descrito no próprio produto como *"a private food Instagram for your clients"* — cliente tira foto da refeição e sobe, treinador vê/curte/comenta. **Puramente manual e social, sem nenhum cálculo de macro** — confirma que o "photo-to-macro" automático não existe nem aqui. Print: `everfit-food-journal.png`.
- **Macros** (outra aba, com sub-abas "Macros Report" e "Journal (NEW)"): dashboard de meta vs. realizado — anel de calorias, barras de Protein/Carbs/Fat (daily avg vs. goal), gráfico de calorias diárias na semana, distribuição de macro em %, totais por dia. Print: `everfit-macros.png`.
- **Meal Plan do cliente** (estruturado): calendário mensal + visão dia/semana, "Daily Nutrition Total" (anel + barras vs. meta), múltiplos planos nomeados atribuíveis por período ("Ben Demo Meal Plan", Sep 07–13), refeições com foto/nome/macro por item (ex.: "Mushroom Brie Omelet Ensemble — 359 cal · P25g · C4g · F27g"), botões "Copy Day"/"Copy Week"/"Repeat", abas irmãs "Recipe Books" e "Dietary Preferences". Print: `everfit-client-mealplan.png`.

**Gaps de nutrição atualizados**: (a) geração de plano por IA a partir de metas de macro — Everfit tem, nós não; (b) dashboard de meta-vs-realizado com histórico/gráfico — Everfit tem, nós temos só o cálculo do momento (ativ.31); (c) foto→macro automático — **ninguém tem**, oportunidade real de diferencial.

### 5. Booking & Scheduling
- Calendar com filtro por Trainer/Client, "Connect Calendar" (sync com calendário externo), toggle Week/1-4 semanas.
- **Session Types**: catálogo de tipos de sessão (ex.: "Personal Training" 45min 1:1, "Consultation" 30min 1:1) — cada tipo com duração e formato.
- Prints: `everfit-booking.png`, `everfit-sessiontypes.png`.
- Não testamos Availability/Booking Activities em detalhe (ficaram vazios na conta trial).

### 6. Payment & Packages
- Cria página de venda hospedada e pública: `package.everfit.io/<slug>` — link de venda fora do app, pra cobrar por pacote de sessões (avulso ou recorrente).
- Print: `everfit-packages.png`.
- Isso é conceitualmente o que nosso `treatment-plans` faz, mas com página pública própria por pacote.

### 7. On-demand (biblioteca de conteúdo gravado)
- "Resource Collections": pastas de recursos (ex.: Educational Guides, Workout Music Playlists, Fitness Podcasts) atribuíveis a grupos de clientes.
- Distinto de "Workout Collections"/"On-demand Programs" (conteúdo de treino pré-gravado, sem coaching ao vivo).
- Print: `everfit-studio.png`.

### 8. Community Forums
- Feed social completo por grupo/forum: posts com foto/vídeo/enquete, "New Posts", **Leaderboard** (ex.: ranking de passos) alimentado por integração com **Autoflow**.
- Print: `everfit-forums.png`.

### 9. Automation (Onboarding Flow + Autoflow)
- **Onboarding Flow**: pipeline visual de 3 blocos ligados por seta — `Onboarding Forms → Onboarding Messages → Assignments` (assignments = auto-atribuir Program + auto-inscrever em Forum). Cada bloco tem toggle on/off independente. Ainda em "Draft" na conta trial.
- **Autoflow**: add-on pago (paywall "START AUTOMATION TRIAL") pra agendar posts de forum com antecedência e (pelo visto no Forum) alimentar leaderboards automáticos.
- Prints: `everfit-automation.png`, `everfit-autoflow.png`.

### 10. Tasks (biblioteca, não por aluno)
- Templates reutilizáveis de tarefa: "Coaching Call or Event", "Regular Progress Check", "Weekly Weigh In", "Goal Setting" — cada um com ícone/tipo próprio, criados uma vez e reaproveitados em qualquer atribuição.
- Print: `everfit-tasks.png`.

### 11. Forms & Questionnaires
- 4 formulários padrão pré-criados na conta nova: **Nutrition Intake Form** (16 perguntas), **Nutrition Check-in Form** (13), **Welcome Form** (11), **Medical History/PAR-Q Form** (16).
- Abas "Your Forms / All Forms / Archived", contador de respostas por formulário.
- Print: `everfit-forms.png`.
- Nota: o PAR-Q (Physical Activity Readiness Questionnaire) é um formulário padrão da indústria fitness pra triagem de risco antes de iniciar treino — relevante tanto pro personal quanto pra clínica.

### 12. Metric Groups
- Dois grupos prontos: **Body Composition** (5 métricas: Weight, Body Fat, BMI, Lean Body Mass, Body Fat...) e **Body Measurements** (10 métricas: Hip, Chest, Waist, Shoulders, Calf Left, Calf...).
- "Manage Metrics" (catálogo global) + "Add New Metric Group" (agrupamento customizado por objetivo).
- Print: `everfit-metrics.png`.

### 13. Perfil do cliente (visão do treinador) — a peça que amarra tudo

Abrindo um cliente demo (`everfit-client-profile.png`, `everfit-client-overview-full.png`), o perfil tem abas: `Overview · Training · Tasks · Sessions (NEW) · Metrics · Food Journal · Macros · Meal Plan · On-demand · Studio · Documents · Settings`.

- **Overview**: cards de Training (últimos 7/30 dias tracked, próxima semana assigned, último treino), **Body Metrics Overview** com gráficos de Weight/Sleep/Resting Heart Rate/Steps (Sleep+HR+Steps sugerem integração com wearable/Apple Health, não input manual), **Goal & Countdown** compartilhado com o cliente (ex.: desafio "10km" com contagem de dias), Notes, Limitations/Injuries, Progress Photos.
- **Training** (`everfit-client-training-calendar.png`): não é um formulário — é um **calendário de arrastar-e-soltar** por cliente, com abas `Assignment / History / Master Planner / Save as Program`, toggle 1/2/4 semanas. Recursos nativos: drag-and-drop de exercícios/treinos, **copy+paste de treino** (programação rápida entre dias), "save workouts to library for future use", exercícios alternativos, e **sync automático e imediato com o app do cliente** a qualquer edição.
- **Sessions** (`everfit-client-sessions.png`): sub-abas `Upcoming Sessions / Credits / Self-booking` — confirma o modelo de **créditos pré-pagos de sessão** e toggle de auto-agendamento pelo próprio cliente, por cliente.

Isso confirma que o "Program/Training" deles não é uma feature isolada — é o centro do produto, com todo o resto (forms, tasks, forums, on-demand) linkado à ficha do cliente.

## Tabela-resumo: gap vs. nosso sistema

| Área | Everfit (real) | Nós | Prioridade sugerida |
|---|---|---|---|
| Program Templates multi-semana + Live Sync + assign em massa | ✅ | ❌ (só treino avulso por aluno) | **Alta** — maior diferença estrutural |
| AI: import de PDF/texto de treino existente | ✅ | ❌ (só geração por prompt, Activity 32) | Média |
| Workout builder: supersets, %1RM, AMRAP/Timed/Interval, seções freestyle | ✅ | Parcial/❌ (verificar no WorkoutBuilder atual) | Média |
| Nutrição: "Generate Meals AI" a partir de metas de macro | ✅ (add-on pago) | ❌ | Média |
| Nutrição: dashboard meta-vs-realizado com histórico/gráfico | ✅ (Macros Report) | Parcial (só cálculo do momento, ativ.31) | Média |
| Nutrição: foto→macro automático (MacroSnap) | ❌ (nem eles têm — Food Journal é só foto social manual) | ❌ (backlog ativ.31) | **Oportunidade de diferencial real** |
| Client Training Calendar (drag&drop, copy+paste, sync imediato c/ app) | ✅ | Parcial (WorkoutBuilder é formulário, não calendário) | **Alta** — junto com Program Templates |
| Booking self-service (Session Types, Availability, créditos) | ✅ | Parcial (agenda simples, sem self-booking/créditos) | Média |
| Payment: página pública de venda por pacote | ✅ (`package.everfit.io/slug`) | Parcial (treatment-plans interno, sem página pública própria) | Baixa/Média |
| On-demand content library | ✅ | ❌ | Baixa (nicho) |
| Community Forums + leaderboard | ✅ | ❌ | Baixa/Média (engajamento) |
| Automation (Onboarding Flow, Autoflow) | ✅ | ❌ | Média |
| Tasks como item de biblioteca (reutilizável) | ✅ | ❌ (só task por paciente) | Baixa |
| Forms & Questionnaires (incl. PAR-Q) | ✅ | ❌ | Média (PAR-Q é relevante pra ambos os produtos) |
| Metric Groups customizáveis | ✅ | Parcial (métricas fixas hardcoded) | Baixa/Média |

## Achado colateral (bug, não gap) — nav collision "Workouts"

Confirmado em código nesta mesma sessão: a aba "Training → Workouts" do personal trainer aponta pra `/admin/treatment-plans` (página legada de pacotes/cobrança clínica, não tem `clinicalOnly: true`), não pro `WorkoutBuilder` real. Além disso o checkout dessa página usa a conta Stripe global (`lib/stripe.ts`), não `stripeFor(clinicId)` da Activity 28 — ou seja, pagamento de um personal trainer nessa tela cairia na conta do BPR, não na dele. Correção proposta (pendente de aprovação do Bruno): marcar `treatments` como `clinicalOnly: true` em `lib/admin-sections.ts` e dar ao `WorkoutBuilder` uma entrada própria no menu do personal.

## Próximos passos sugeridos

1. Bruno prioriza qual gap vira a próxima Activity numerada (spec + QA adversarial + aprovação, como sempre).
2. Candidata natural pelo tamanho do gap: **Program Templates** (multi-semana, assign em massa, live sync).
3. Fix pontual independente (não precisa de spec completa): logo `variant="dark"` no sidebar + `clinicalOnly` no tab de treatments — aguardando OK do Bruno pra aplicar.
