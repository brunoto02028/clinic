# QA comparativo — área do paciente: WEB × APP

**Data:** 23/09/2026
**Commit:** `96b2b93a`
**Ambiente:** Web `http://localhost:4000` (Next dev) · App `http://localhost:8083` (Expo Web → API :4000) · Postgres `bpr_clinic_local`
**Paciente:** `maria.final.email@example.com` (fictício) · clínica `bruno-physical-rehabilitation` · `preferredLocale: en-GB`
**Método:** scripts Playwright em `.qa-tmp/` (o MCP estava travado). Contexto de browser novo e independente para cada lado, um browser por vez.

**Resultado geral:** ❌ **reprovado para liberar aos pacientes** — 2 telas quebradas, 13 divergências de conteúdo, e o idioma invertido em 15 das 18 telas.

---

## Dado de referência (lido direto do banco)

| Item | Quantidade |
|---|---|
| Consultas | 3 (12, 13 e 14/08/2026 — todas `PENDING`, £60, `IN_PERSON`) |
| Notas SOAP | 4 |
| Documentos | 4 |
| Tarefas | 2 (1 `pending`, 1 `completed`) — todas com par EN/PT |
| Prescrições de exercício | 2 (3×10 e 3×12) |
| Outcome measure | 1 — VAS 3, FAAM ADL 58, FAAM Sport 21, ADL 69%, Sport 65,6%, função geral 70% |
| Mensagens da clínica | 5 |
| Triagem | 1 |
| Protocolos de tratamento | 2 |
| Conteúdo educativo | **0** (tabela vazia — par 10 não é testável) |

---

## As duas passadas

O paciente foi testado **duas vezes**, em estados de acesso diferentes. Isso é essencial para ler a tabela.

| | Passada 1 — **gate fechado** | Passada 2 — **gate aberto** |
|---|---|---|
| `fullAccessOverride` da Maria | `false` | `true` |
| O que representa | o que um paciente real vê hoje: a clínica não tem nenhuma linha em `ClinicModuleAccess`, então o gate fecha (fail-closed) | o mesmo paciente com acesso liberado |
| Cobertura | **os 18 pares**, nos dois lados | os 8 pares que bateram no paywall (01, 02, 05, 06, 07, 09, 10, 15), nos dois lados |
| Screenshots | `NN-slug-web.png` / `NN-slug-app.png` | `NN-slug-web-unlocked.png` / `NN-slug-app-unlocked.png` |

A passada 1 responde **"os dois lados negam igual?"**. A passada 2 responde **"quando os dois mostram, mostram a mesma coisa?"**. As duas deram achado.

---

## Tabela resumo

| # | Par | Veredito | Observação |
|---|---|---|---|
| 1 | `/dashboard` × home da clínica | ⚠️ conteúdo | Com o gate fechado o app afirma "0 exercises today"; existem 2. Com o gate aberto vira "2 exercises today" — o 403 virava um zero |
| 2 | `appointments` × `/appointments` | ⚠️ conteúdo | 3 = 3, mas o app não mostra preço nem status de pagamento; a web não mostra o terapeuta |
| 3 | `appointments/[id]` × `/appointment/[id]` | ⚠️ conteúdo | App não tem pagar, cancelar, nem política de cancelamento |
| 4 | `appointments/book` × `/book-appointment` | ❌ quebrado | Quebrado nos **dois**, por motivos diferentes: web 400 em `/api/availability`, app bloqueado por CORS |
| 5 | `treatment` × `/treatment-protocol` | ⚠️ conteúdo | App mostra 4 títulos; a web mostra dosagem, progresso, semanas e o texto clínico inteiro |
| 6 | `exercises` × `/exercises` | ⚠️ conteúdo | Divergência estrutural conhecida (T-8): a web redireciona para `treatment`, o app mantém aba própria |
| 6b | — × `/exercise/[id]` | ✅ igual | Funciona ao tocar o card. Só o deep link por id de exercício falha (o id da rota é o da prescrição) |
| 7 | `clinical-notes` × `/clinical-notes` | ❌ **quebrado** | **Web mostra as 4 notas SOAP; o app mostra zero** — 404 em `/api/patient/clinical-notes` |
| 8 | `consent` × `/consent` | ⚠️ conteúdo | App mostra um resumo em bullets (858 car.) no lugar do termo completo (6.908 car.), e omite a data do aceite |
| 9 | `documents` × `/documents` | ⚠️ conteúdo | 4 = 4, mas os dois lados exibem **datas diferentes** do mesmo documento; app não tem autor, selo "Verified" nem download |
| 10 | `education` × `/education` | ⚠️ não testável | Banco sem conteúdo educativo. Vazio dos dois lados — a web explica o vazio, o app não |
| 11 | `guide` × `/guide` | ⚠️ conteúdo | App perde o aviso do prazo de 24h, a linha do tempo recomendada e o FAQ |
| 12 | `questions` × `/messages` | ✅ igual | 5 = 5, atribuição e horários batem. O melhor par do conjunto |
| 13 | `outcome-measures` × `/outcome-measures` | ⚠️ **conteúdo** | **O FAAM inteiro não existe no app** — nem os 19 itens do questionário, nem os escores já registrados |
| 14 | `screening` × `/screening` | ⚠️ conteúdo | Mesmo wizard de 9 etapas; o app não avisa que a triagem já está concluída |
| 15 | `tasks` × `/tasks` | ⚠️ conteúdo | 1 = 1, mas o app não mostra o prazo (24/09) nem permite concluir a tarefa |
| 16 | `assessment-flow` × `/assessment-progress` | ⚠️ conteúdo | App mostra só "Concluído"; a web mostra os valores (queixa, dor 6/10, VAS 3/10, FAAM 69%/65,6%) |
| 17 | `profile` × `/profile` | ⚠️ conteúdo + ❌ rota | App não tem o seletor de idioma do paciente. Deep link `/profile` cai em `/module-select` |
| 18 | `biohacking` × `/daily-checkin` | ⚠️ conteúdo | App perde wearables (6 serviços), campo de HRV e o status do protocolo |

Contagem: **1 igual sem ressalva** (12), **1 igual com ressalva** (6b), **2 quebrados** (4, 7), **13 divergências de conteúdo**, **1 não testável** (10).

---

## Achado 0 — o gate nega de formas diferentes nos dois lados

Foi o achado mais sistemático da passada 1, e ele corre **nas duas direções**.

### Direção A — o app entrega o que a web vende

Com o gate fechado, a web bloqueou 7 páginas com um paywall explícito:

> Upgrade your plan to unlock this resource and get full access to your health tools.
> **View Membership Plans** — From £0.90/month

No mesmo instante, com o mesmo paciente, o app entregou o conteúdo de 4 delas:

| Tela | Web (gate fechado) | App (gate fechado) |
|---|---|---|
| Consultas | paywall | **as 3 consultas** |
| Documentos | paywall | **os 4 documentos** |
| Tarefas | paywall | **a tarefa pendente** |
| Educação | paywall | lista (vazia só porque não há conteúdo no banco) |

A causa está na camada: a web tranca **na página**, mas a API só tranca em 3 rotas. Verificado com token bearer real, `fullAccessOverride: false`:

```
/api/exercises                403  {"error":"My Exercises is not included in your plan"}
/api/patient/protocol         403  {"error":"Treatment Plan is not included in your plan"}
/api/patient/clinical-notes   403  {"error":"My Records is not included in your plan"}
/api/patient/appointments     200  {"appointments":[... 3 ...]}
/api/patient/documents        200  {"documents":[... 4 ...]}
/api/patient/tasks            200  {"tasks":[... 2 ...]}
/api/patient/outcome-measures 200  {"measures":{"vasScore":3,"faamAdl":58,...}}
/api/mobile/entitlements      200  {"entitlements":[]}
```

Um paciente sem nenhum entitlement recebe consultas, documentos, tarefas e outcome measures pela API. Como o app só fala com a API, ele mostra tudo. **O gate não é do produto, é só da web.**

### Direção B — onde o gate pega, o app chama de falha técnica

Nas 3 rotas que realmente barram, a API devolve uma mensagem pronta e correta (`"My Exercises is not included in your plan"`). O app descarta essa mensagem e mostra erro de rede:

| Tela | Web diz | App diz |
|---|---|---|
| `treatment` | "Upgrade your plan… View Membership Plans" | "Não foi possível carregar — a consulta falhou. **Tentar de novo**" |
| `exercises` | idem | "Não foi possível carregar os exercícios." |
| `clinical-notes` | idem | "Não foi possível carregar suas notas… a consulta falhou. **Tentar de novo**" |

O paciente fica preso num botão "Tentar de novo" que nunca vai funcionar, sem saber que o problema é comercial e sem o caminho para resolver. É pior que o paywall: o paywall ao menos aponta a saída.

### Direção C — a home transforma o 403 num número

Pior caso dos três. Com o gate fechado, a home do app diz:

> YOUR PLAN — **0 exercises today**

Não é erro nem paywall: é uma **afirmação falsa**. O paciente tem 2 exercícios prescritos. Com o gate aberto, a mesma tela diz "2 exercises today". O `catch` virou zero.

**Evidência:** `screenshots/01-dashboard-app.png` (0) × `screenshots/01-dashboard-app-unlocked.png` (2).

---

## Divergências de conteúdo e telas quebradas

### 7. Notas clínicas — a web mostra 4, o app mostra zero ❌

A pior divergência do relatório. Passada 2, os dois lados com acesso liberado.

- **Web** (`screenshots/07-clinical-notes-web-unlocked.png`): as 4 notas SOAP, com Subjective e Assessment por extenso e autor. Ex.: *"Second session (1 week later). Patient reports slight improvement in shoulder pain, now 5/10 (was 6/10)…"*, *"18 Sept 2026 — By Bruno Admin"*.
- **App** (`screenshots/07-clinical-notes-app-unlocked.png`): "Não foi possível carregar suas notas. Isto não quer dizer que você não tenha notas — a consulta falhou. Tentar de novo".
- **Rede:** `404 GET /api/patient/clinical-notes`, reproduzido 3× seguidas.

⚠️ **Provável artefato de ambiente, não bug de produto.** O fonte de `app/api/patient/clinical-notes/route.ts` está correto e não tem caminho que devolva 404; `.next/server/app/api/patient/clinical-notes/route.js` está compilado e recente; e às 07:40 a mesma rota respondeu `403` do `assertModuleAccess`, provando que ela executava. Rotas irmãs na mesma pasta (`protocol`, `documents`, `tasks`) respondem 200 o tempo todo. Bate com o bug conhecido de colisão de chunk do Next em dev.

**Detalhe que o restart do servidor não resolveu:** com o gate **fechado** a rota devolve 403 (foi o que a sessão principal mediu depois do restart), mas com o gate **aberto** ela volta a 404 — o 403 vem antes e esconde o 404. **Confirmar em build de produção antes de fechar a atividade.**

Achado lateral, na web: o cabeçalho da página do paciente é *"Manage SOAP documentation for patient appointments"* — texto de staff numa tela de paciente.

### 4. Agendamento — quebrado nos dois lados ❌

Nenhum dos dois consegue agendar, por motivos diferentes.

- **Web** (`screenshots/04-book-web.png`): *"No available dates at the moment. Please contact the clinic."* — **29 requisições** `400 GET /api/availability?date=…&duration=60&therapistId=` com `therapistId` vazio.
- **App** (`screenshots/04-book-app.png`): o formulário monta (tipo de consulta, 14 dias), mas a faixa de horários nunca sai de *"Selecione uma data primeiro."*. A chamada morre em CORS:

```
Access to fetch at http://localhost:4000/api/public/schedule from origin
http://localhost:8083 has been blocked by CORS policy: Response to preflight
request does not pass access control check: No Access-Control-Allow-Origin header…
```

Confirmado fora do browser — a rota não emite o header, ao contrário das irmãs:

```
OPTIONS /api/public/schedule        → 204, sem access-control-allow-origin
GET     /api/patient/appointments   → 200, access-control-allow-origin: *
```

O endpoint em si responde (`200 {"schedule":[]}` via curl). São dois defeitos empilhados: falta o CORS **e** a agenda está vazia.

### 13. Outcome measures — o FAAM inteiro não existe no app ⚠️

- **Web** (`screenshots/13-outcome-measures-web.png`): VAS + **FAAM ADL com 13 itens** (Standing, Walking on even ground, Going up stairs, Squatting…) + **FAAM Sport** (Running, Jumping, Landing from a jump, Cutting…), cada um com escala de 5 pontos.
- **App** (`screenshots/13-outcome-measures-app.png`): só dois sliders — "Escala de Dor (VAS)" = 3 e "Funcionalidade geral" = 70%.

Os escores gravados (`faamAdl 58`, `faamSport 21`, `faamAdlPercent 69`, `faamSportPercent 65,6`) **não aparecem em lugar nenhum do app**, embora a API os devolva na mesma resposta que alimenta os dois sliders.

Agravante: o app oferece **"Salvar medidas"**. Um paciente que salva pelo app grava um registro sem FAAM.

### 16. Progresso da avaliação — o app mostra a casca, a web mostra os números ⚠️

Os dois dizem 2/2 e 100%. A diferença é tudo o que vem junto:

| | Web | App |
|---|---|---|
| Etapa 1 | "Complaint: Right shoulder pain, worse overhead, 3 months" · "Pain: 6/10" · botão **View** | só "Concluido" |
| Etapa 2 | "VAS: 3/10 \| FAAM ADL: 69% \| Sport: 65.6%" · botão **View** | só "Concluido" |
| Explicação | "How does it work?" · "~5 min total" · "Therapist reviewed" | ausente |

`screenshots/16-assessment-web.png` × `screenshots/16-assessment-app.png`

### 5. Plano de tratamento — o app perde a dosagem e o conteúdo clínico ⚠️

Passada 2, os dois liberados.

- **Web** (`screenshots/05-treatment-web-unlocked.png`, 3.804 car.): bloco **"Today · Wednesday 23 September — 0/4"**, cada exercício com dosagem (*"3 sets · 12 reps · hold 2s · every other day"*), o protocolo *"Plantar Heel Pain (Plantar Fasciopathy) — By Bruno · 12 weeks · 0% · 0/4 completed"*, a descrição, a divisão por semanas e o texto clínico do item, incluindo **RED FLAGS** e gatilho de re-encaminhamento.
- **App** (`screenshots/05-treatment-app-unlocked.png`, 323 car.): 4 títulos e a fase de cada um. Sem dosagem, sem progresso, sem semanas, sem descrição.

A dosagem existe no app, mas na **outra aba** (`/exercises`: "3x10", "3x12") — o paciente precisa cruzar duas telas para saber o que fazer hoje.

*(Observação fora do escopo: a web exibe o texto de RED FLAGS — critérios de suspeita de artropatia inflamatória, fratura por estresse, sinais neurais — direto para o paciente. Vale uma decisão editorial, mas é da web, não do app.)*

### 3. Detalhe da consulta — o app não paga e não cancela ⚠️

| | Web | App |
|---|---|---|
| Tipo, status, data, hora, duração, preço, terapeuta | ✅ | ✅ |
| **Pagamento** ("Payment Pending £60.00" + **Pay Now**) | ✅ | ❌ |
| **Solicitar cancelamento** | ✅ | ❌ |
| **Política de cancelamento** | ✅ | ❌ |
| Aviso de taxa ("50% cancellation fee applies") | ✅ | ❌ |

`screenshots/03-appointment-detail-web.png` × `screenshots/03-appointment-detail-app.png`

Bug encontrado de passagem **na web**: para uma consulta de agosto ela imprime *"Appointment is in **-1008h** — within 24h window. 50% charge applies."* — horas negativas tratadas como dentro da janela de 24h, e cobra taxa por cancelar uma consulta já passada.

### 2. Lista de consultas — cada lado esconde um campo do outro ⚠️

3 consultas nos dois. As diferenças:

| | Web | App |
|---|---|---|
| Preço + "Payment Pending" por consulta | ✅ | ❌ |
| Nome do terapeuta na lista | ❌ | ✅ ("Bruno Admin") |
| Waitlist / "Start with an Initial Assessment" | ✅ | ❌ |
| Ordem | crescente (12 → 14/08) | decrescente (14 → 12/08) |

`screenshots/02-appointments-web-unlocked.png` × `screenshots/02-appointments-app-unlocked.png`

### 9. Documentos — os dois lados mostram datas diferentes do mesmo documento ⚠️

4 documentos nos dois. Mas:

| Documento | Data na web | Data no app |
|---|---|---|
| Right Knee Arthroscopy Report (2021) | 12/08/2026 | 20 de jun. de 2021 |
| Right Shoulder Ultrasound Report | 12/08/2026 | 10 de dez. de 2025 |
| GP Referral Letter | 12/08/2026 | 15 de dez. de 2025 |

A web carimba a data de **upload**, o app a data do **documento**. Nenhum dos dois diz qual está mostrando, então o mesmo laudo aparenta ser de 2021 num lado e de 2026 no outro.

Só na web: autor (*"Dr. Mr. David Park (Orthopaedic Surgeon)"*, *"Dr. Dr. Sarah Chen"* — note o prefixo duplicado, bug da web), selo **Verified** e botão **Download**.

`screenshots/09-documents-web-unlocked.png` × `screenshots/09-documents-app-unlocked.png`

### 15. Tarefas — o app não mostra prazo nem deixa concluir ⚠️

Os dois mostram **1** tarefa (a concluída fica oculta nos dois — ok).

| | Web | App |
|---|---|---|
| Título | "Ice the ankle for 15 minutes" (**EN**) | "Gelo no tornozelo por 15 minutos" (**PT**) |
| Prazo | **"Due: 24/09/2026"** | ❌ ausente |
| Data de criação | 23/09/2026 | ❌ ausente |
| Concluir | botão **Done** | ❌ não existe |

Uma tarefa sem prazo e sem como marcar feita é um aviso, não uma tarefa. `screenshots/15-tasks-web-unlocked.png` × `screenshots/15-tasks-app-unlocked.png`

### 8. Consentimento — o app faz o paciente aceitar um resumo ⚠️

- **Web** (`screenshots/08-consent-web.png`, 6.908 car.): o termo completo, 11+ cláusulas numeradas (Introduction, Clinical Services, Medical Disclaimer, Informed Consent for Treatment, Accuracy of Information, Data Controller, Lawful Basis…), e **"You accepted the terms on 12/08/2026"**.
- **App** (`screenshots/08-consent-app.png`, 858 car.): "Terms accepted" **sem data**, e um resumo em bullets no lugar do termo.

O app está **em inglês** e declara corretamente os provedores de IA (Anthropic; Groq com Google de fallback) — esse ponto está certo. O problema é o texto ser um resumo: para consentimento informado sob UK GDPR, o paciente precisa alcançar o termo integral pelo app.

### 11. Guia — o app perde o aviso operacional mais importante ⚠️

A web abre com um alerta que o app não tem:

> **Important: Before Your Appointment** — complete steps 1 and 2 at least **24 hours before** your appointment. Without this information, **your appointment may need to be rescheduled**.

Também só na web: a *Recommended Timeline* (ao se cadastrar / 48h / 24h / dia da consulta), o **FAQ**, e os checklists item a item de cada etapa. O app tem as 4 etapas em versão curta.

`screenshots/11-guide-web.png` (387 KB) × `screenshots/11-guide-app.png` (152 KB)

### 18. Check-in diário — o app perde wearables, HRV e o status do protocolo ⚠️

| | Web | App |
|---|---|---|
| Check-in (dor, energia, sono, estresse, humor, exercício, notas) | ✅ | ✅ |
| **Wearables** (Oura, Garmin, Whoop, Fitbit, Polar, Strava) | ✅ 6 botões | ❌ |
| **Campo de HRV (ms)** | ✅ | ❌ |
| Status do protocolo ("No active protocol yet…") | ✅ | ❌ |

Os wearables já estão documentados como bloqueados pelo allowlist do middleware. O HRV e o status do protocolo não estavam.

### 17. Perfil — sem seletor de idioma, e deep link quebrado ⚠️❌

- **Web** (`screenshots/17-profile-web.png`): formulário — **Email Language (EN / PT)**, Preferred Communication Channel, Date of Birth, Phone, Address, Emergency Contact, Save Changes, Change Email, Change Password.
- **App** (`screenshots/17-profile-app.png`): um hub de navegação com 15 atalhos (Messages, My records, Treatment plan, Edit profile, Notifications, Switch module, Sign out…). Em inglês.

Falta no app o **seletor de idioma do paciente** — e isso pesa, porque o app ignora `preferredLocale` (ver a seção de idioma). O paciente não consegue nem corrigir o idioma por conta própria. Também não há "Change Email".

❌ **Rota:** abrir `/profile` por URL direta cai em `/module-select`, não no perfil da clínica. Só a barra de abas chega lá. Qualquer deep link ou push notification apontando para `/profile` leva o paciente para o seletor de módulo.

### 14. Triagem — o app não avisa que já está concluída ⚠️

Mesmo wizard de 9 etapas, mesmos nomes, mesmos campos na etapa 1. A web acrescenta, para quem já respondeu:

> **Screening Complete** — You can update your information below if anything has changed.

O app abre em "1 / 9" sem nenhum sinal de que a triagem já foi enviada. O paciente pode achar que precisa refazer. A web também tem o botão "Previous"; o app só tem "Próximo".

### 10. Educação — vazio nos dois, mas só a web explica o vazio ⚠️

O banco tem **0** linhas em `educationContent` e `/api/education` responde com todos os arrays vazios (`assignments`, `published`, `categories`). Não dá para comparar conteúdo.

- **Web**: contadores (0 Assigned / 0 Completed / 0 Available), aba "Browse All" e a explicação *"Your therapist will assign educational content after your sessions."*
- **App**: "Nenhum conteúdo disponível."

Vale registrar que **aqui** o vazio do app é honesto (a API respondeu 200 vazio). Nos pares 5, 6 e 7 o vazio vinha de 403/404 — e é justamente aí que o paciente não tem como distinguir um do outro.

### 6 / 6b. Exercícios — divergência estrutural conhecida, detalhe OK ⚠️✅

`/dashboard/exercises` **redireciona para** `/dashboard/treatment` (unificação da atividade 043). O app mantém aba própria com 2 exercícios e a dosagem (3x10, 3x12). É exatamente o que a T-8 prevê resolver — registrado aqui como confirmação, não como novidade.

O **detalhe do exercício funciona** quando alcançado tocando o card (`screenshots/06b-exercise-detail-app-unlocked.png`): "Pectoral Doorway Stretch · 3 Series · 10 Repeticoes · Descricao · Instrucoes · Marcar como concluido", com descrição e instruções completas em inglês. A rota usa o **id da prescrição**; um deep link montado com o **id do exercício** devolve "Exercicio nao encontrado." — não é caminho de usuário, mas é uma armadilha para quem for montar deep link.

---

## Idioma — invertido em 15 das 18 telas

Inglês é a língua canônica do produto e a Maria é `preferredLocale: en-GB`. **A web respeita isso em 100% das telas. O app ignora em 15 de 18.**

**Em inglês no app (correto):** home, consent, messages, profile.

**Em português fixo no app, para um paciente en-GB:**

| Tela | Amostra |
|---|---|
| `/appointments` | "Agenda", "Agendar", "Pendente", "sex., 14 de ago. de 2026" |
| `/appointment/[id]` | "Agendamento", "Data", "Horário", "Duração", "Qua, 12 Ago 2026" |
| `/book-appointment` | "Agendar Consulta", "Tipo de consulta", "Observações", "Confirmar Agendamento" |
| `/treatment-protocol` | "Protocolo", "Plano de Tratamento", "Curto Prazo (Agudo)", "Médio Prazo (Reabilitação)" |
| `/exercises`, `/exercise/[id]` | "Exercícios", "2 exercícios", "Series", "Repeticoes", "Marcar como concluido" |
| `/clinical-notes` | "Notas Clínicas", "Documentação SOAP das suas consultas" |
| `/documents` | "Laudos, exames e receitas"; categorias "Tratamento Anterior", "Exames de Imagem", "Encaminhamento Médico" |
| `/education` | "Educação", "Nenhum conteúdo disponível." |
| `/guide` | tela inteira |
| `/outcome-measures` | cabeçalho EN, corpo PT — "Avalie sua dor e funcionalidade", "Escala de Dor (VAS)" |
| `/screening` | tela inteira, 9 etapas |
| `/tasks` | "Tarefas", "1 pendente", "Alta" |
| `/assessment-progress` | "Progresso da Avaliacao", "Concluido" |
| `/daily-checkin` | "Check-in Diário", "Dor", "Energia", "Qualidade do Sono", "Estresse", "Humor" |

### O teste das tarefas gêmeas

A tarefa existe nos dois idiomas no banco (`title` / `titlePt`). Para a **mesma paciente en-GB**:

- **Web** escolhe `title`: *"Ice the ankle for 15 minutes"* ✅
- **App** escolhe `titlePt`: *"Gelo no tornozelo por 15 minutos"* ❌

O app não está consultando `preferredLocale` — está fixo em PT. E, como o par 17 mostra, o app também não oferece o seletor de idioma para o paciente corrigir.

### Acentuação perdida

Várias telas do app usam português **sem acento**: "Exercicio", "Repeticoes", "Descricao", "Instrucoes", "Avaliacao", "Concluido", "Nao foi possivel", "Duas vezes ao dia, depois dos exercicios". Mistura-se com telas acentuadas ("Notas Clínicas", "Educação") na mesma sessão.

---

## Erros de console

**Nenhuma exceção de JavaScript (`pageerror`) em nenhum dos dois lados, nas duas passadas.** Todas as falhas são HTTP.

### Web

| Passada | Tela | Erro |
|---|---|---|
| 1 | `appointments/book` | **29×** `400 GET /api/availability?date=…&duration=60&therapistId=` (therapistId vazio) |
| 1 | `questions` | `404 GET /uploads/documents/…/1786528956440-patient-dashboard-bell.png` — o anexo referenciado não está em disco |
| 2 | `dashboard` | `ERR_ABORTED` em `/api/patient/outcome-measures/due` e `/api/patient/onboarding-status` (abortadas na navegação, sem impacto visível) |

### App

| Passada | Tela | Erro |
|---|---|---|
| 1 | home | 4× `403` — `/api/exercises`, `/api/patient/protocol` |
| 1 | `book-appointment` | `CORS` + `ERR_FAILED` em `/api/public/schedule` |
| 1 | `treatment-protocol` | `403 /api/patient/protocol` |
| 1 | `exercises`, `exercise/[id]` | `403 /api/exercises` |
| 1 | `clinical-notes` | `403 /api/patient/clinical-notes` |
| 2 | `clinical-notes` | `404 /api/patient/clinical-notes` (ver ressalva de ambiente no par 7) |
| 2 | demais telas | limpo |

Vale o registro: as telas que o app mostra vazias por 403/404 (**5, 6, 7**) não registram nada visível para o paciente além de "Tentar de novo". Só o console distingue vazio de falha — exatamente a confusão que este QA procurava.

---

## O que o paciente perde no app

Lista objetiva, só o que a web entrega e o app não:

1. **As notas clínicas.** 4 notas SOAP na web, zero no app. *(confirmar em build de produção)*
2. **O FAAM.** Os 19 itens do questionário e os escores já registrados (ADL 58/69%, Sport 21/65,6%).
3. **Pagar uma consulta.** "Payment Pending £60.00" e o botão Pay Now só existem na web.
4. **Cancelar uma consulta** e ler a política de cancelamento.
5. **Agendar.** Bloqueado por CORS no app (e quebrado na web por outro motivo).
6. **A dosagem dentro do plano de tratamento.** Séries, repetições, tempo de sustentação e frequência aparecem na web dentro do plano; no app só na aba de exercícios.
7. **O progresso do protocolo.** "0/4 completed", "0%", "12 weeks", a divisão por semanas e o texto clínico dos itens.
8. **Os números da avaliação.** Queixa, dor 6/10, VAS 3/10, FAAM 69%/65,6% — a web mostra, o app só diz "Concluído".
9. **O prazo das tarefas e a ação de concluir.** "Due: 24/09/2026" e o botão Done.
10. **O termo de consentimento integral** e a data do aceite.
11. **O aviso do prazo de 24h** do guia — o único texto que diz que a consulta pode ser remarcada por falta de triagem. Mais o FAQ e a linha do tempo.
12. **O aviso de que a triagem já está concluída.**
13. **Wearables, campo de HRV e status do protocolo de biohacking.**
14. **O seletor de idioma** — e, junto, a chance de corrigir o português forçado.
15. **Autor, selo "Verified" e download dos documentos**; e a data exibida é outra.
16. **A explicação do estado vazio** — na web, um vazio vem rotulado; no app, vazio e falha são a mesma tela.

E o que o app entrega e a web **não** deveria estar entregando de graça: **consultas, documentos e tarefas para um paciente sem nenhum entitlement** (Achado 0, direção A).

---

## Veredito

### ❌ Não liberar o app para os pacientes ainda.

Quatro bloqueadores, em ordem:

1. **Notas clínicas em branco (par 7).** Um paciente que abre "Notas Clínicas" e lê "não foi possível carregar" conclui que a clínica não documentou a sessão dele. São 4 notas reais. Tem forte cheiro de artefato do dev server, mas **enquanto não for confirmado num build de produção, é bloqueador** — e a confirmação é barata.

2. **O gate divergente (Achado 0).** Nas três direções: o app entrega consultas, documentos e tarefas que a web cobra; onde o gate pega, o app chama paywall de falha de rede e prende o paciente num "Tentar de novo" inútil; e a home chega a afirmar "0 exercises today" para quem tem 2. É um problema de produto e de receita ao mesmo tempo. A decisão precisa ser explícita: **ou a API passa a barrar o que a web barra, ou a web para de barrar** — mas os dois não podem discordar sobre o mesmo paciente.

3. **O idioma invertido.** 15 das 18 telas forçam português para uma paciente `en-GB`, incluindo a escolha do título da tarefa, que o backend já entrega nos dois idiomas. A web acerta em 100%. Inglês é a língua canônica do produto e o app não a respeita — e ainda não oferece o seletor para o paciente corrigir. Não é cosmético: é a primeira impressão de todo paciente internacional.

4. **Agendar não funciona.** No app é CORS (uma linha de header na `/api/public/schedule`); na web é `therapistId` vazio gerando 400. O app tem "Book a session" na home e "Agendar" na agenda — dois caminhos que não levam a lugar nenhum.

### O que **não** bloqueia

- Mensagens (par 12) está pronto: 5 = 5, atribuição e horários corretos, em inglês. É o padrão que as outras telas deveriam seguir.
- Consentimento e perfil já estão em inglês.
- O detalhe do exercício funciona pelo caminho real.
- A divergência de exercícios (par 6) já é conhecida e tem dono (T-8).
- Educação (par 10) não pôde ser testada por falta de dado — não conte como aprovada.

### Ordem sugerida

**Antes de qualquer build:** confirmar o par 7 em produção → decidir o lado certo do gate (Achado 0) → CORS do `/api/public/schedule` → `preferredLocale` nas 15 telas.

**Antes de chamar de paridade:** FAAM (13), pagar/cancelar (3), prazo e ação das tarefas (15), termo integral (8), aviso de 24h do guia (11).

---

## Anexos

- **Screenshots:** `specs/070-app-paciente-clinica/qa/screenshots/` — `NN-slug-web.png` / `NN-slug-app.png` (passada 1, gate fechado) e `NN-slug-web-unlocked.png` / `NN-slug-app-unlocked.png` (passada 2, gate aberto).
- **Scripts e capturas brutas** (texto visível, console e rede por tela): `.qa-tmp/run-web.js`, `.qa-tmp/run-app.js`, `.qa-tmp/run-pass2.js`, `.qa-tmp/db-facts.js` e os `*-result.json` correspondentes.
- **Estado do banco:** `fullAccessOverride` foi alternado apenas para a paciente fictícia Maria e devolvido ao valor em que a sessão principal o deixou (`true`). Nenhum outro dado foi criado ou alterado.

---

## Verificação em build de produção (23/09/2026, depois do relatório)

Dois dos quatro bloqueadores dependiam de saber se o comportamento era do servidor de dev ou do
produto. `npm run build` + `next start -p 4100`, mesmo banco, mesma paciente, gate **aberto**:

| Bloqueador | Dev | Produção | Conclusão |
|---|---|---|---|
| 4 — notas clínicas 404 | 404 consistente | **200, 3×, com as 4 notas** | Artefato do dev (colisão de chunk). **Não é bug de produto.** |
| 3 — CORS do agendamento | preflight sem header | **preflight 204 sem nenhum header de CORS** | **Bug real, confirmado.** |

Comparação que isola o bug 3:

```
OPTIONS /api/public/schedule      -> 204, nenhum header access-control-*
OPTIONS /api/patient/appointments -> 204 + allow-origin: * + allow-methods + allow-headers
```

`/api/public` não está em `MOBILE_API_PREFIXES` no `middleware.ts`; `/api/patient` está. Enquanto
isso, o app não consegue agendar — e agendar é o fluxo que mais importa nesta entrega.

Restam **três** bloqueadores: idioma invertido, divergência de gate e CORS do agendamento.
